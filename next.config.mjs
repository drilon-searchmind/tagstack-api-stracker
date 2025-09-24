// filepath: c:\Users\Searchmind\Documents\DEV\INTERN\TAGSTACK_API_TRACKER\tagstack-api-stracker\next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    // don't bundle these server-only runtime packages
    serverExternalPackages: ["@sparticuz/chromium", "chrome-aws-lambda", "puppeteer-core", "puppeteer"],
    
    // Ensure webpack properly handles these modules
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Externalize packages to prevent bundling issues
            const origExternals = config.externals;
            config.externals = [
                ...(typeof origExternals === 'function' 
                    ? [(ctx, req, cb) => (
                        req.startsWith('puppeteer') ||
                        req.startsWith('chrome-aws-lambda') ||
                        req.startsWith('@sparticuz/chromium')
                            ? cb(null, `commonjs ${req}`)
                            : origExternals(ctx, req, cb)
                    )]
                    : origExternals),
                'puppeteer-core',
                'puppeteer',
                'chrome-aws-lambda',
                '@sparticuz/chromium',
            ];
        }
        
        return config;
    },
    
    experimental: {
        serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "chrome-aws-lambda", "puppeteer"],
        serverMinificationGlobals: false,
        esmExternals: 'loose' // Try 'loose' instead of true to handle ESM compatibility better
    },
    
    // Ensure consistent runtime for API routes
    reactStrictMode: true
};

export default nextConfig;