// Helper for initializing puppeteer across different environments

// Import modules with fallback methods
const loadModule = async (moduleName) => {
  try {
    // Try dynamic import first
    try {
      const mod = await import(moduleName);
      return mod.default || mod;
    } catch (importErr) {
      // Fall back to CommonJS require
      // This is needed because Next.js doesn't always handle ESM imports correctly for some packages
      const required = require(moduleName);
      return required;
    }
  } catch (err) {
    console.error(`Failed to load ${moduleName}:`, err);
    return null;
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
      // Try puppeteer first in local dev
      runtime.puppeteer = await loadModule('puppeteer');
      
      if (!runtime.puppeteer) {
        // Fall back to puppeteer-core + chromium
        runtime.puppeteer = await loadModule('puppeteer-core');
        runtime.chromium = await loadModule('@sparticuz/chromium') || 
                           await loadModule('chrome-aws-lambda');
                           
        if (runtime.chromium) {
          runtime.executablePath = typeof runtime.chromium.executablePath === 'function' 
            ? await runtime.chromium.executablePath() 
            : runtime.chromium.executablePath;
          runtime.args = runtime.chromium.args || [];
        }
      }
    }
    
    if (!runtime.puppeteer) {
      throw new Error("No puppeteer runtime found. Install puppeteer-core or puppeteer.");
    }
    
    // Standard launch args that work across environments
    const launchArgs = [
      ...(runtime.args || []),
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      ...(process.env.VERCEL ? ["--disable-gpu", "--single-process"] : []),
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