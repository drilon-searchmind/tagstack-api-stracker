export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
// removed static puppeteer import to avoid bundling issues
import * as acorn from 'acorn';

// helper: extract top-level var/let/const data = { ... } object text
function extractVarObjectFromScript(code, varName = 'data') {
    if (!code || typeof code !== 'string') return null;
    // find "var data", "let data" or "const data" or "data =" occurrences
    const re = new RegExp('\\b(?:var|let|const)\\s+' + varName + '\\s*=|\\b' + varName + '\\s*=', 'i');
    const m = re.exec(code);
    if (!m) return null;
    // start scanning from the first '{' after the match
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

        // handle comments
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

        // handle string/regex/template literal state entry/exit
        if (!inSingle && !inDouble && !inTemplate && ch === '/' && prevChar !== '\\') {
            // naive detection of regex vs division - we only need to skip regex literals, so attempt a simple heuristic:
            // if previous non-whitespace char is one of [=,(,:;!?{[}] then treat as start of regex
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
            // skip ${ } expressions inside template: we must still count braces inside expressions - best-effort skip:
            prevChar = ch;
            continue;
        }

        // Now actual brace counting
        if (ch === '{') {
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0) {
                // extract from initial '{' to this '}'
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
    // parse failed (minified/invalid), return null so you fall back to the heuristic extractor
    return null;
  }
  return null;
}

// A GET /api/scan?url=... endpoint that runs a headful scan with Puppeteer
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

    // dynamic import for server runtime (Vercel) to avoid packaging chrome-aws-lambda at build-time
    // runtime-safe dynamic loader to avoid Turbopack/Next static analysis of chrome-aws-lambda
    async function tryDynamicImport(spec) {
      try {
        // using new Function to avoid static bundler analysis of import/require strings
        const mod = await new Function(`return import('${spec}')`)();
        return mod && (mod.default || mod);
      } catch (e) {
        return null;
      }
    }

    let chromium = await tryDynamicImport("chrome-aws-lambda");
    let puppeteer = await tryDynamicImport("puppeteer-core");

    // Fallback to plain puppeteer (dev) if puppeteer-core missing
    if (!puppeteer) {
      const puppeteerFallback = await tryDynamicImport("puppeteer");
      puppeteer = puppeteerFallback || null;
    }

    // If chrome-aws-lambda not available (local dev), use a safe shim
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

                // extract only the var data = { ... } object (prefer Acorn, fallback to scanner)
                let dataText = null;
                try {
                    dataText = extractVarObjectWithAcorn(content, 'data');
                } catch (e) {
                    dataText = null;
                }
                if (!dataText) dataText = extractVarObjectFromScript(content, 'data');

                // if extraction failed, keep safe fallback (empty string or full content as last resort)
                const finalContent = dataText || ""; // <-- exactly what will be returned as c.gtmJs.content

                c.gtmJs = {
                    src: gtmUrl,
                    status: resp.status,
                    // content now contains only the data object text (or empty string if not found)
                    content: finalContent,
                    contentLength: finalContent.length
                };
            } else {
                c.gtmJs = { src: gtmUrl, status: resp.status };
            }
        } catch (err) {
            // fallback: try reading your example gtmjs.js from temp-folder if available (useful for offline testing)
            try {
                const fallbackPath = path.join(process.cwd(), "..", "temp-folder", "gtmjs.js");
                if (fs.existsSync(fallbackPath)) {
                    const fallbackContent = fs.readFileSync(fallbackPath, "utf8");

                    // extract data object from fallback too
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

        // inside your for (const c of containers) { ... } after c.gtmJs.content exists:
        if (c.gtmJs && c.gtmJs.content) {
            // prefer AST extraction, fall back to the existing text-scanner
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