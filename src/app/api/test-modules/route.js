// filepath: c:\Users\Searchmind\Documents\DEV\INTERN\TAGSTACK_API_TRACKER\tagstack-api-stracker\src\app\api\test-modules\route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
    const modules = {
        puppeteerCore: testRequire('puppeteer-core'),
        puppeteer: testRequire('puppeteer'),
        chromium: testRequire('@sparticuz/chromium'),
        chromeAwsLambda: testRequire('chrome-aws-lambda')
    };
    
    return NextResponse.json({
        modules,
        environment: {
            nodeVersion: process.version,
            platform: process.platform
        }
    });
}

function testRequire(moduleName) {
    try {
        const mod = require(moduleName);
        return { loaded: true, version: typeof mod.version === 'function' ? mod.version() : 'unknown' };
    } catch (err) {
        return { loaded: false, error: err.message };
    }
}