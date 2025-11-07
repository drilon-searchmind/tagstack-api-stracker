export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as acorn from 'acorn';
import { ServerSideGTMDetector } from '../../utils/serverSideGTMDetector.js';

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

export async function POST(request) {
    try {
        const { url } = await request.json();
        
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log(`Starting GTM scan for: ${url}`);
        
        const detector = new ServerSideGTMDetector();
        
        // Use browser-based detection for dynamic content (Stape widgets, etc.)
        const results = await detector.detectGTMContainers(url, true);

        // Format results for API response
        const response = {
            success: true,
            url: results.url || url,
            scanTimestamp: results.scannedAt || new Date().toISOString(),
            containers: results.containerIDs || [],
            detectionMethods: results.detectionMethods || [],
            dataLayerEvents: results.dataLayerEvents || [],
            scripts: results.scriptsFound || [],
            networkRequests: results.networkRequests || [], // New: network requests from browser
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