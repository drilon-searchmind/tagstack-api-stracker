export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as acorn from 'acorn';

function extractVarObjectFromScript(code, varName = 'data') {
    if (!code || typeof code !== 'string') return null;
    const re = new RegExp('\\b(?:var|let|const)\\s+' + varName + '\\s*=|\\b' + varName + '\\s*=', 'i');
    const m = re.exec(code);
    if (!m) return null;
    let idx = code.indexOf('{', m.index);
    if (idx === -1) return null;

    let i = idx;
    const len = code.length;
    let depth = 0;
    let inSingle = false, inDouble = false, inTemplate = false, inRegex = false;
    let prevChar = '';
    let inLineComment = false, inBlockComment = false;

    for (; i < len; i++) {
        const ch = code[i];
        const next = code[i + 1];

        if (!inSingle && !inDouble && !inTemplate && !inRegex) {
            if (!inBlockComment && ch === '/' && next === '/') { inLineComment = true; i++; prevChar = ''; continue; }
            if (!inLineComment && ch === '/' && next === '*') { inBlockComment = true; i++; prevChar = ''; continue; }
        }
        if (inLineComment) {
            if (ch === '\n') inLineComment = false;
            prevChar = ch;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') { inBlockComment = false; i++; prevChar = ''; continue; }
            prevChar = ch;
            continue;
        }

        if (!inSingle && !inDouble && !inTemplate && ch === '/' && prevChar !== '\\') {
            let j = i - 1;
            while (j >= 0 && /\s/.test(code[j])) j--;
            const prev = j >= 0 ? code[j] : '';
            if (prev === '' || /[=(:,;!?+\-*{[\n]/.test(prev)) {
                inRegex = true;
                prevChar = ch;
                continue;
            }
        }
        if (inRegex) {
            if (ch === '/' && prevChar !== '\\') { inRegex = false; prevChar = ch; continue; }
            if (ch === '\n') { inRegex = false; } // safety
            prevChar = ch;
            continue;
        }

        if (!inSingle && !inDouble && !inTemplate && ch === "'") { inSingle = true; prevChar = ch; continue; }
        if (inSingle) { if (ch === "'" && prevChar !== '\\') inSingle = false; prevChar = ch; continue; }

        if (!inSingle && !inDouble && !inTemplate && ch === '"') { inDouble = true; prevChar = ch; continue; }
        if (inDouble) { if (ch === '"' && prevChar !== '\\') inDouble = false; prevChar = ch; continue; }

        if (!inSingle && !inDouble && !inTemplate && ch === '`') { inTemplate = true; prevChar = ch; continue; }
        if (inTemplate) {
            if (ch === '`' && prevChar !== '\\') { inTemplate = false; prevChar = ch; continue; }
            prevChar = ch;
            continue;
        }

        if (ch === '{') {
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0) {
                const objText = code.slice(idx, i + 1);
                return objText;
            }
        }

        prevChar = ch;
    }

    return null; // not found / unbalanced
}

function extractVarObjectWithAcorn(code, varName = 'data') {
  try {
    const ast = acorn.parse(code, { ecmaVersion: 'latest', ranges: true });
    for (const node of ast.body) {
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations) {
          if (decl.id && decl.id.name === varName && decl.init && decl.init.range) {
            const [start, end] = decl.init.range;
            return code.slice(start, end);
          }
        }
      }
      if (node.type === 'ExpressionStatement' && node.expression && node.expression.type === 'AssignmentExpression') {
        const a = node.expression;
        const left = a.left;
        const leftName = left && (left.name || (left.type === 'MemberExpression' && left.property && left.property.name));
        if (leftName === varName && a.right && a.right.range) {
          const [start, end] = a.right.range;
          return code.slice(start, end);
        }
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

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

    async function tryDynamicImport(spec) {
      try {
        const mod = await new Function(`return import('${spec}')`)();
        return mod && (mod.default || mod);
      } catch (e) {
        return null;
      }
    }

    let chromium = await tryDynamicImport("chrome-aws-lambda");
    let puppeteer = await tryDynamicImport("puppeteer-core");

    if (!puppeteer) {
      const puppeteerFallback = await tryDynamicImport("puppeteer");
      puppeteer = puppeteerFallback || null;
    }

    if (!chromium) {
      chromium = {
        args: [],
        executablePath: async () => process.env.CHROME_PATH || undefined,
        defaultViewport: null,
        headless: true,
      };
    }

    if (!puppeteer) {
      throw new Error("No puppeteer runtime found (install puppeteer-core or puppeteer).");
    }

    let execPath;
    if (chromium && typeof chromium.executablePath === "function") {
      execPath = await chromium.executablePath();
    } else {
      execPath = chromium && chromium.executablePath ? chromium.executablePath : process.env.CHROME_PATH;
    }
    const launchArgs = [
      ...((chromium && chromium.args && chromium.args.length) ? chromium.args : []),
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ];

    const browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: chromium.defaultViewport || null,
      headless: typeof chromium.headless === "boolean" ? chromium.headless : true,
      executablePath: execPath || undefined,
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; GTM-Scanner/1.0)");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    if (typeof page.waitForTimeout === "function") {
        await page.waitForTimeout(2000);
    } else {
        await new Promise((r) => setTimeout(r, 2000));
    }

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
        const scripts = Array.from(document.querySelectorAll("script[src]")).map((s) => s.src);
        const gtm = window.google_tag_manager || null;
        const dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer.slice(-200) : null;
        return {
            scripts,
            hasGTMObject: !!gtm,
            gtmKeys: gtm ? Object.keys(gtm) : [],
            dataLayerSnapshot: dataLayer,
            userAgent: navigator.userAgent,
        };
    });

    const interesting = extra.scripts.filter((s) =>
        /gtm\.js|gtag\/js|loader\.js|googletagmanager|googlesyndication|tagmanager/i.test(s)
    );
    const fetchedScripts = [];
    const foundIds = new Set((rawResult && rawResult.containerIDs) || []);
    const idRegex = /\b(GTM-[A-Z0-9-_]+|G-[A-Z0-9-_]+|GT-[A-Z0-9-_]+)\b/gi;

    async function fetchScriptContent(srcUrl) {
        try {
            const resolved = new URL(srcUrl, url).toString();
            const resp = await fetch(resolved, { method: "GET" });
            const text = resp.ok ? await resp.text() : "";
            const ids = [];
            let m;
            idRegex.lastIndex = 0;
            while ((m = idRegex.exec(text))) ids.push(m[1]);
            ids.forEach((i) => foundIds.add(i));
            return { src: resolved, status: resp.status, ids: Array.from(new Set(ids)), content: text, contentLength: text.length };
        } catch (err) {
            return { src: srcUrl, error: String(err) };
        }
    }

    for (const src of interesting) {
        const info = await fetchScriptContent(src);
        fetchedScripts.push(info);
    }

    const perfResources = await page.evaluate(() =>
        (performance.getEntriesByType ? performance.getEntriesByType("resource") : []).map((r) => r.name)
    );

    const perfCandidates = (perfResources || []).filter((r) => /gtm\.js|gtag\/js|loader\.js/i.test(r));
    for (const p of perfCandidates) {
        if (!fetchedScripts.some((f) => f.src && f.src.replace(/\/+$/, "") === p.replace(/\/+$/, ""))) {
            const info = await fetchScriptContent(p);
            fetchedScripts.push(info);
        }
    }

    const containers = Array.from(foundIds).map((id) => ({ id }));
    for (const s of fetchedScripts) {
        if (s.ids && s.ids.length) {
            s.ids.forEach((id) => {
                const c = containers.find((x) => x.id === id);
                if (c) {
                    c.src = s.src;
                    c.scriptContent = s.content;
                    c.scriptContentLength = s.contentLength;
                } else {
                    containers.push({ id, src: s.src, scriptContent: s.content, scriptContentLength: s.contentLength });
                }
            });
        } else if (s.src && /googletagmanager\.com\/gtm\.js/i.test(s.src)) {
            containers.push({ id: null, src: s.src, scriptContent: s.content, scriptContentLength: s.contentLength });
        }
    }

    for (const c of containers) {
        if (!c.id) continue;
        const gtmUrl = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(c.id)}`;
        try {
            const resp = await fetch(gtmUrl, { method: "GET" });
            if (resp.ok) {
                const content = await resp.text();

                let dataText = null;
                try {
                    dataText = extractVarObjectWithAcorn(content, 'data');
                } catch (e) {
                    dataText = null;
                }
                if (!dataText) dataText = extractVarObjectFromScript(content, 'data');

                const finalContent = dataText || "";

                c.gtmJs = {
                    src: gtmUrl,
                    status: resp.status,
                    content: finalContent,
                    contentLength: finalContent.length
                };
            } else {
                c.gtmJs = { src: gtmUrl, status: resp.status };
            }
        } catch (err) {
            try {
                const fallbackPath = path.join(process.cwd(), "..", "temp-folder", "gtmjs.js");
                if (fs.existsSync(fallbackPath)) {
                    const fallbackContent = fs.readFileSync(fallbackPath, "utf8");

                    let dataTextFallback = null;
                    try {
                        dataTextFallback = extractVarObjectWithAcorn(fallbackContent, 'data');
                    } catch (e) {
                        dataTextFallback = null;
                    }
                    if (!dataTextFallback) dataTextFallback = extractVarObjectFromScript(fallbackContent, 'data');

                    const finalFallback = dataTextFallback || "";

                    c.gtmJs = {
                        src: `file:${fallbackPath}`,
                        status: 200,
                        content: finalFallback,
                        contentLength: finalFallback.length,
                        note: "fetched-from-local-fallback"
                    };
                } else {
                    c.gtmJs = { src: gtmUrl, error: String(err) };
                }
            } catch (fsErr) {
                c.gtmJs = { src: gtmUrl, error: String(err), fsFallbackError: String(fsErr) };
            }
        }

        if (c.gtmJs && c.gtmJs.content) {
            let dataObjText = extractVarObjectWithAcorn(c.gtmJs.content, 'data');
            if (!dataObjText) dataObjText = extractVarObjectFromScript(c.gtmJs.content, 'data');
            if (dataObjText) {
                c.gtmJs.dataObjectText = dataObjText;
            } else {
                c.gtmJs.dataObjectText = null;
            }
        }
    }

    const result = {
        success: true,
        url,
        scanTimestamp: new Date().toISOString(),
        containers,
        detectionMethods: Array.from(new Set([...(rawResult?.detectionMethods || []), ...(extra?.gtmKeys?.length ? ["google_tag_manager keys"] : [])])),
        dataLayerEvents: rawResult?.dataLayerEvents || extra?.dataLayerSnapshot || [],
        scripts: extra.scripts,
        fetchedScripts,
        networkResources: perfResources || [],
        rawTracer: rawResult || null,
    };

    await browser.close();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}