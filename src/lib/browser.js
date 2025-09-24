
// Use require() as a fallback for Vercel
const loadModule = async (moduleName) => {
    try {
        // First try dynamic import (works in most environments)
        const mod = await new Function(`return import('${moduleName}')`)();
        return mod.default || mod;
    } catch (err) {
        try {
            // If that fails, try require (Node.js/Vercel)
            return new Function(`return require('${moduleName}')`)();
        } catch (reqErr) {
            console.error(`Failed to load ${moduleName}:`, reqErr);
            return null;
        }
    }
};

export async function initBrowser() {
    // Keep track of what we're using
    const runtime = {
        chromium: null,
        puppeteer: null,
        executablePath: null,
        args: [],
    };

    try {
        // On Vercel, prioritize @sparticuz/chromium
        if (process.env.VERCEL) {
            console.log("Running in Vercel environment, trying @sparticuz/chromium...");
            runtime.chromium = await loadModule('@sparticuz/chromium');
            runtime.puppeteer = await loadModule('puppeteer-core');

            if (runtime.chromium) {
                console.log("@sparticuz/chromium loaded successfully");
                runtime.executablePath = await runtime.chromium.executablePath();
                runtime.args = runtime.chromium.args || [];
            } else {
                console.log("Failed to load @sparticuz/chromium, trying chrome-aws-lambda...");
                runtime.chromium = await loadModule('chrome-aws-lambda');

                if (runtime.chromium) {
                    console.log("chrome-aws-lambda loaded successfully");
                    runtime.executablePath = await runtime.chromium.executablePath;
                    runtime.args = runtime.chromium.args || [];
                }
            }
        } else {
            // Local development
            console.log("Running in local environment");
            runtime.chromium = await loadModule('@sparticuz/chromium') ||
                await loadModule('chrome-aws-lambda');
            runtime.puppeteer = await loadModule('puppeteer-core');

            // In local dev, prefer full puppeteer if available
            if (process.env.NODE_ENV !== 'production') {
                const fullPuppeteer = await loadModule('puppeteer');
                if (fullPuppeteer) {
                    console.log("Using full puppeteer for local development");
                    runtime.puppeteer = fullPuppeteer;
                    runtime.chromium = null; // We'll use puppeteer's bundled chromium
                }
            }

            if (runtime.chromium) {
                runtime.executablePath = typeof runtime.chromium.executablePath === 'function'
                    ? await runtime.chromium.executablePath()
                    : runtime.chromium.executablePath;
                runtime.args = runtime.chromium.args || [];
            }
        }

        if (!runtime.puppeteer) {
            throw new Error("No puppeteer runtime found. Install puppeteer-core or puppeteer.");
        }

        // Standard launch args that work across environments
        const launchArgs = [
            ...runtime.args,
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            ...(process.env.VERCEL ? ["--disable-gpu", "--single-process"] : [])
        ];

        const options = {
            args: launchArgs,
            defaultViewport: null,
            headless: true,
        };

        if (runtime.executablePath) {
            options.executablePath = runtime.executablePath;
        }

        console.log("Launching browser with options:", JSON.stringify({
            args: options.args,
            executablePath: options.executablePath ? 'provided' : 'default',
            headless: options.headless,
        }));

        const browser = await runtime.puppeteer.launch(options);
        return { browser, runtime };
    } catch (error) {
        console.error("Browser initialization error:", error);
        throw error;
    }
}