export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) return NextResponse.json({ message: "URL parameter is required" }, { status: 400 });

    const tracerPath = path.join(process.cwd(), "utils", "traceGTMContainers.js");
    let tracerCode = "";
    try {
      tracerCode = fs.readFileSync(tracerPath, "utf8");
      tracerCode = tracerCode.replace(/setTimeout\([^)]*observer\.disconnect\([^)]*\)[^)]*\);?/g, "");
    } catch (err) {
      console.error("Tracer file read error:", err);
      throw new Error(`Tracer file not found at ${tracerPath}`);
    }

    // dynamic import to avoid build-time/server-bundle issues on Vercel
    async function tryDynamicImport(spec) {
      try {
        // `new Function` prevents bundlers from statically resolving the import target
        const mod = await new Function(`return import('${spec}')`)();
        return mod && (mod.default || mod);
      } catch (e) {
        return null;
      }
    }

    // try load chrome-aws-lambda and puppeteer-core (production server)
    let chromium = await tryDynamicImport("chrome-aws-lambda");
    let puppeteer = await tryDynamicImport("puppeteer-core");

    // If running locally prefer full "puppeteer" (it includes a downloaded Chromium).
    // This avoids using chrome-aws-lambda + puppeteer-core locally (which requires CHROME_PATH or a downloaded revision).
    const isLocalDev = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
    if (isLocalDev) {
      const full = await tryDynamicImport("puppeteer");
      if (full) {
        puppeteer = full;
        chromium = null; // don't use chrome-aws-lambda shim locally
      }
    }

    // Fallback logic: if chrome-aws-lambda missing prefer full puppeteer; if chromium present ensure puppeteer available
    if (!chromium) {
      const fullPuppeteer = puppeteer || await tryDynamicImport("puppeteer");
      if (fullPuppeteer) puppeteer = fullPuppeteer;
    } else {
      if (!puppeteer) {
        const fullFallback = await tryDynamicImport("puppeteer");
        if (fullFallback) puppeteer = fullFallback;
      }
    }

    // Ensure we have a usable chromium executable path when using puppeteer-core.
    // If using chrome-aws-lambda, get its executablePath. Otherwise, if puppeteer (full) is used,
    // it will manage its own local Chromium.
    if (!puppeteer) {
      throw new Error("No puppeteer runtime found. Install puppeteer-core or puppeteer.");
    }

    let execPath;
    if (chromium && typeof chromium.executablePath === "function") {
      execPath = await chromium.executablePath();
    } else if (chromium && chromium.executablePath) {
      execPath = chromium.executablePath;
    } else {
      // no chrome-aws-lambda available: if puppeteer-core is in use without an execPath, try to switch
      // to full puppeteer (it has local Chromium). If still puppeteer-core and no execPath, require CHROME_PATH.
      if (String(puppeteer?.version?.()).includes("core") || !chromium) {
        // try to ensure full puppeteer is used when possible (already attempted above)
        execPath = process.env.CHROME_PATH || undefined;
      } else {
        execPath = process.env.CHROME_PATH || undefined;
      }
    }

    if (execPath && typeof execPath.then === "function") {
      execPath = await execPath;
    }

    const launchArgs = [
      ...((chromium && chromium.args && chromium.args.length) ? chromium.args : []),
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ];

    const launchOptions = {
      args: launchArgs,
      defaultViewport: chromium?.defaultViewport || null,
      headless: typeof chromium?.headless === "boolean" ? chromium.headless : true,
    };
    if (execPath) launchOptions.executablePath = execPath;

    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; GTM-Scanner/1.0)");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    if (typeof page.waitForTimeout === "function") await page.waitForTimeout(1500);
    else await new Promise((r) => setTimeout(r, 1500));

    const rawResult = await page.evaluate(async (code) => {
      try {
        eval(code);
        if (typeof traceGTMContainers === "function") {
          const r = await traceGTMContainers();
          if (r && r.containerIDs && typeof r.containerIDs.forEach === "function") {
            r.containerIDs = Array.from(r.containerIDs);
          }
          return r;
        }
        return { error: "traceGTMContainers not found" };
      } catch (e) {
        return { error: "tracer_eval_error", message: String(e) };
      }
    }, tracerCode);

    const extra = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script[src]")).map(s => s.src);
      const perf = (performance.getEntriesByType ? performance.getEntriesByType("resource") : []).map(r => r.name);
      const gtm = window.google_tag_manager || null;
      const dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer.slice(-200) : null;
      return { scripts, perfResources: perf, gtmKeys: gtm ? Object.keys(gtm) : [], dataLayerSnapshot: dataLayer };
    });

    const idRegex = /\b(GTM-[A-Z0-9-_]+|G-[A-Z0-9-_]+|GT-[A-Z0-9-_]+)\b/gi;
    const found = new Set();

    if (rawResult && Array.isArray(rawResult.containerIDs)) {
      rawResult.containerIDs.forEach(id => found.add(id));
    }

    if (Array.isArray(extra.gtmKeys)) {
      extra.gtmKeys.forEach(k => { if (/^GTM-/.test(k)) found.add(k); });
    }

    const tryExtractFromList = (list) => {
      if (!Array.isArray(list)) return;
      for (const s of list) {
        if (!s || typeof s !== "string") continue;
        let m;
        idRegex.lastIndex = 0;
        while ((m = idRegex.exec(s))) found.add(m[1]);
      }
    };
    tryExtractFromList(extra.scripts);
    tryExtractFromList(extra.perfResources);

    const containers = Array.from(found).map(id => ({ id }));

    const result = {
      success: true,
      url,
      scanTimestamp: new Date().toISOString(),
      containers,
      detectionMethods: Array.from(new Set([...(rawResult?.detectionMethods || []), ...(extra?.gtmKeys?.length ? ["google_tag_manager keys"] : [])])),
      dataLayerEvents: rawResult?.dataLayerEvents || extra?.dataLayerSnapshot || [],
      scripts: extra.scripts,
      rawTracer: rawResult || null
    };

    await browser.close();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}