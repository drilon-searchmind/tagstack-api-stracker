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

    // Always use Vercel-compatible Puppeteer setup
    async function tryDynamicImport(spec) {
      try {
        const mod = await new Function(`return import('${spec}')`)();
        return mod && (mod.default || mod);
      } catch (e) {
        return null;
      }
    }

    // Try to import Vercel-compatible packages first
    let chromium = await tryDynamicImport("@sparticuz/chromium");
    let puppeteer = await tryDynamicImport("puppeteer-core");

    if (!puppeteer) {
      const puppeteerFallback = await tryDynamicImport("puppeteer");
      puppeteer = puppeteerFallback || null;
    }

    if (!chromium) {
      chromium = {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu"
        ],
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
      ...((chromium && chromium.args && chromium.args.length) ? chromium.args : [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu"
      ]),
    ];

    console.log(`Launching browser with execPath: ${execPath || 'default'}`);
    console.log(`Launch args: ${launchArgs.join(' ')}`);

    const browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: chromium.defaultViewport || null,
      headless: typeof chromium.headless === "boolean" ? chromium.headless : true,
      executablePath: execPath || undefined,
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; GTM-Scanner/1.0)");
    
    console.log(`Navigating to: ${url}`);
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
            c.gtmJs = { src: gtmUrl, error: String(err) };
        }
    }

    const result = {
        success: !rawResult?.error,
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

export async function POST(request) {
    try {
        const { url } = await request.json();
        
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log(`Starting GTM scan for: ${url}`);
        
        // Always use Vercel-compatible Puppeteer setup for consistency
        const results = await detectWithVercelPuppeteer(url);

        // Format results for API response
        const response = {
            success: true,
            url: results.url || url,
            scanTimestamp: results.scannedAt || new Date().toISOString(),
            containers: results.containerIDs || [],
            detectionMethods: results.detectionMethods || [],
            dataLayerEvents: results.dataLayerEvents || [],
            scripts: results.scriptsFound || [],
            networkRequests: results.networkRequests || [],
            rawTracer: {
                isGTMPresent: results.isGTMPresent || false,
                containerIDs: results.containerIDs || [],
                detectionMethods: results.detectionMethods || [],
                dataLayerEvents: results.dataLayerEvents || [],
                scriptsFound: results.scriptsFound || [],
                networkRequests: results.networkRequests || []
            }
        };

        console.log(`GTM scan completed for ${url}:`, {
            containersFound: response.containers.length,
            detectionMethods: response.detectionMethods.length,
            networkRequests: response.networkRequests.length
        });

        return NextResponse.json(response);

    } catch (error) {
        console.error('GTM scan error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to scan URL',
                details: error.message,
                success: false
            }, 
            { status: 500 }
        );
    }
}

async function detectWithVercelPuppeteer(url) {
    const results = {
        isGTMPresent: false,
        containerIDs: [],
        detectionMethods: [],
        dataLayerEvents: [],
        scriptsFound: [],
        networkRequests: [],
        url: url,
        scannedAt: new Date().toISOString()
    };

    let browser;
    try {
        results.detectionMethods.push('Starting Vercel-compatible browser detection');

        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());

        const proxy = process.env.PROXY_SERVER || null; // Set your proxy server here
        const launchOptions = {
            headless: false, // Use non-headless mode for better evasion
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                ...(proxy ? [`--proxy-server=${proxy}`] : [])
            ]
        };

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // Randomize user agent and viewport
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        );
        await page.setViewport({
            width: Math.floor(1024 + Math.random() * 100),
            height: Math.floor(768 + Math.random() * 100),
        });

        // Navigate to the page
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait longer for dynamic content to load
        await page.waitForTimeout(5000);

        // Check for CAPTCHA
        const isCaptcha = await page.$('iframe[src*="captcha"], iframe[src*="turnstile"]');
        if (isCaptcha) {
            results.detectionMethods.push('CAPTCHA detected. Consider using a CAPTCHA-solving service.');
            throw new Error('CAPTCHA detected');
        }

        // Check for GTM in the final DOM
        const pageGTMIds = await page.evaluate(() => {
            const gtmPattern = /GTM-[A-Z0-9]+/gi;
            const bodyText = document.body.innerHTML;
            const matches = bodyText.match(gtmPattern);
            return matches ? [...new Set(matches)] : [];
        });

        if (pageGTMIds.length > 0) {
            results.containerIDs.push(...pageGTMIds);
            results.detectionMethods.push(`GTM IDs found in final DOM: ${pageGTMIds.join(', ')}`);
            results.isGTMPresent = true;
        }

        // Check for dataLayer
        const dataLayerData = await page.evaluate(() => {
            if (window.dataLayer && Array.isArray(window.dataLayer)) {
                return window.dataLayer.slice(-50); // Get last 50 events
            }
            return [];
        });

        if (dataLayerData.length > 0) {
            results.dataLayerEvents = dataLayerData;
            results.detectionMethods.push(`Found ${dataLayerData.length} dataLayer events`);
            results.isGTMPresent = true;
        }

        // Get script sources
        const scriptSources = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script[src]')).map(script => script.src);
        });

        results.scriptsFound = scriptSources.filter(src => 
            src.includes('gtm') || src.includes('analytics') || src.includes('stape')
        );

        // Store network requests for analysis
        results.networkRequests = networkRequests.filter(req => 
            req.url.includes('gtm') || 
            req.url.includes('analytics') || 
            req.url.includes('stape')
        );

        results.detectionMethods.push(`Browser scan completed. Found ${results.containerIDs.length} containers.`);

    } catch (error) {
        results.detectionMethods.push(`Browser detection error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    return results;
}