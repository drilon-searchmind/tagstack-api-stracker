import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

/* ...existing code... */

// A GET /api/scan?url=... endpoint that runs a headful scan with Puppeteer
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get("url");
        if (!url) return NextResponse.json({ message: "URL parameter is required" }, { status: 400 });

        // Read tracer code you already have
        const tracerPath = path.join(process.cwd(), "utils", "traceGTMContainers.js");
        let tracerCode = "";

        // Safety: remove any trailing global observer.disconnect() call in the tracer
        try {
            tracerCode = fs.readFileSync(tracerPath, "utf8");
            // remove any top-level observer.disconnect() calls or auto-run timeouts that reference local vars
            tracerCode = tracerCode.replace(/setTimeout\([^)]*observer\.disconnect\([^)]*\)[^)]*\);?/g, "");
        } catch (err) {
            console.error("Tracer file read error:", err);
            // return an error from the handler if the tracer is required
            // (if inside GET/POST handler, respond with 500). If outside handler keep throw.
            throw new Error(`Tracer file not found at ${tracerPath}`);
        }

        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (compatible; GTM-Scanner/1.0)");
        // Increase timeout for pages that lazy-load
        await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
        // allow late scripts to run
        await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
        // allow late scripts to run (use waitForTimeout if available, otherwise fallback)
        if (typeof page.waitForTimeout === "function") {
            await page.waitForTimeout(2000);
        } else {
            await new Promise((r) => setTimeout(r, 2000));
        }

        // Inject and run tracer in page context
        const rawResult = await page.evaluate(async (code) => {
            try {
                // evaluate tracer script
                // eslint-disable-next-line no-eval
                eval(code);
                if (typeof traceGTMContainers === "function") {
                    const r = await traceGTMContainers();
                    // convert Sets to arrays (if tracer used them)
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

        // Snapshot of page-level indicators
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

        // For each script that looks like GTM/GTAG/loader, fetch content and look for container IDs
        const interesting = extra.scripts.filter((s) =>
            /gtm\.js|gtag\/js|loader\.js|googletagmanager|googlesyndication|tagmanager/i.test(s)
        );
        const fetchedScripts = [];
        const foundIds = new Set((rawResult && rawResult.containerIDs) || []);
        const idRegex = /\b(GTM-[A-Z0-9-_]+|G-[A-Z0-9-_]+|GT-[A-Z0-9-_]+)\b/gi;

        // helper to fetch script and extract IDs
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

        // Also scan performance resource entries (network) and fetch any GTM-like resources
        const perfResources = await page.evaluate(() =>
            (performance.getEntriesByType ? performance.getEntriesByType("resource") : []).map((r) => r.name)
        );

        const perfCandidates = (perfResources || []).filter((r) => /gtm\.js|gtag\/js|loader\.js/i.test(r));
        for (const p of perfCandidates) {
            // skip if already fetched (by resolved URL)
            if (!fetchedScripts.some((f) => f.src && f.src.replace(/\/+$/, "") === p.replace(/\/+$/, ""))) {
                const info = await fetchScriptContent(p);
                fetchedScripts.push(info);
            }
        }

        // Build containers array from foundIds + any fetchedScripts that look like GTM containers
        const containers = Array.from(foundIds).map((id) => ({ id }));
        // If a fetched script contains a GTM id, attach its content to the container entry
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
                // If no id extracted but URL looks like gtm.js, include as unknown container-source
                containers.push({ id: null, src: s.src, scriptContent: s.content, scriptContentLength: s.contentLength });
            }
        }

        // For each detected container id, fetch the canonical GTM script from googletagmanager.com/gtm.js?id=...
        for (const c of containers) {
            if (!c.id) continue;
            const gtmUrl = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(c.id)}`;
            try {
                const resp = await fetch(gtmUrl, { method: "GET" });
                if (resp.ok) {
                    const content = await resp.text();
                    c.gtmJs = { src: gtmUrl, status: resp.status, content, contentLength: content.length };
                } else {
                    c.gtmJs = { src: gtmUrl, status: resp.status };
                }
            } catch (err) {
                // fallback: try reading your example gtmjs.js from temp-folder if available (useful for offline testing)
                try {
                    const fallbackPath = path.join(process.cwd(), "..", "temp-folder", "gtmjs.js");
                    if (fs.existsSync(fallbackPath)) {
                        const fallbackContent = fs.readFileSync(fallbackPath, "utf8");
                        c.gtmJs = { src: `file:${fallbackPath}`, status: 200, content: fallbackContent, contentLength: fallbackContent.length, note: "fetched-from-local-fallback" };
                    } else {
                        c.gtmJs = { src: gtmUrl, error: String(err) };
                    }
                } catch (fsErr) {
                    c.gtmJs = { src: gtmUrl, error: String(err), fsFallbackError: String(fsErr) };
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