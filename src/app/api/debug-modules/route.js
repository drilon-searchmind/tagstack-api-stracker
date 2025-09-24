// filepath: c:\Users\Searchmind\Documents\DEV\INTERN\TAGSTACK_API_TRACKER\tagstack-api-stracker\src\app\api\debug-modules\route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Helper to safely try importing a module
async function tryImport(moduleName) {
  const results = {
    dynamicImport: { success: false, error: null },
    require: { success: false, error: null },
    version: null
  };
  
  try {
    const mod = await new Function(`return import('${moduleName}')`)();
    results.dynamicImport.success = true;
    if (mod && (mod.default || mod)) {
      const resolved = mod.default || mod;
      if (typeof resolved.version === 'function') {
        results.version = resolved.version();
      }
    }
  } catch (err) {
    results.dynamicImport.error = err.message;
  }
  
  try {
    const req = new Function(`return require('${moduleName}')`)();
    results.require.success = true;
    if (typeof req.version === 'function' && !results.version) {
      results.version = req.version();
    }
  } catch (err) {
    results.require.error = err.message;
  }
  
  return results;
}

export async function GET() {
  const modules = {
    '@sparticuz/chromium': await tryImport('@sparticuz/chromium'),
    'chrome-aws-lambda': await tryImport('chrome-aws-lambda'),
    'puppeteer-core': await tryImport('puppeteer-core'),
    'puppeteer': await tryImport('puppeteer')
  };
  
  return NextResponse.json({
    environment: {
      isVercel: !!process.env.VERCEL,
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV,
      region: process.env.VERCEL_REGION || null,
      platform: process.platform,
      arch: process.arch
    },
    modules
  });
}