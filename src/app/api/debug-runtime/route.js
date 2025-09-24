import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function tryDynamicImport(spec) {
  try {
    // Try direct import first
    const mod = await new Function(`return import('${spec}')`)();
    if (mod && (mod.default || mod)) {
      return mod && (mod.default || mod);
    }
    
    // If direct import fails on Vercel, try require
    if (process.env.VERCEL) {
      try {
        // Use require as fallback on Vercel
        const req = new Function(`return require('${spec}')`)();
        return req;
      } catch (reqErr) {
        console.error(`Require fallback failed for ${spec}:`, reqErr);
        return null;
      }
    }
    return null;
  } catch (e) {
    console.error(`Import failed for ${spec}:`, e);
    return null;
  }
}

export async function GET() {
    const chromium = await tryDynamicImport("@sparticuz/chromium");
    const chromeAws = await tryDynamicImport("chrome-aws-lambda");
    const puppeteerCore = await tryDynamicImport("puppeteer-core");
    const puppeteerFull = await tryDynamicImport("puppeteer");

    // safe info for logs
    console.log("debug-runtime:", {
        sparticuz: !!chromium && !chromium.__importError,
        chromeAwsLambda: !!chromeAws && !chromeAws.__importError,
        puppeteerCore: !!puppeteerCore && !puppeteerCore.__importError,
        puppeteerFull: !!puppeteerFull && !puppeteerFull.__importError,
    });

    return NextResponse.json({
        sparticuz: chromium ? (chromium.__importError ? { ok: false, err: chromium.__importError } : { ok: true }) : { ok: false },
        chromeAwsLambda: chromeAws ? (chromeAws.__importError ? { ok: false, err: chromeAws.__importError } : { ok: true }) : { ok: false },
        puppeteerCore: puppeteerCore ? (puppeteerCore.__importError ? { ok: false, err: puppeteerCore.__importError } : { ok: true, version: puppeteerCore?.version?.() || null }) : { ok: false },
        puppeteerFull: puppeteerFull ? (puppeteerFull.__importError ? { ok: false, err: puppeteerFull.__importError } : { ok: true, version: puppeteerFull?.version?.() || null }) : { ok: false },
        // Add environment info
        environment: {
          isVercel: !!process.env.VERCEL,
          nodeEnv: process.env.NODE_ENV,
          region: process.env.VERCEL_REGION || null,
        }
    });
}