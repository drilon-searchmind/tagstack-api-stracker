export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as acorn from 'acorn';
import { initBrowser } from "@/lib/browser";

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

    // Initialize browser using our helper
    const { browser, runtime } = await initBrowser();
    
    // Log what we're using for debugging
    console.log("Browser initialized with:", {
      puppeteer: !!runtime.puppeteer,
      chromium: !!runtime.chromium,
      executablePath: !!runtime.executablePath
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; GTM-Scanner/1.0)");
    // Rest of your code remains the same...

    // Just make sure to close the browser at the end
    await browser.close();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}