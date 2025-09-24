// filepath: c:\Users\Searchmind\Documents\DEV\INTERN\TAGSTACK_API_TRACKER\tagstack-api-stracker\next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    // don't bundle these server-only runtime packages
    serverExternalPackages: ["@sparticuz/chromium", "chrome-aws-lambda", "puppeteer-core"],
    
    // Increase serverless function size limit
    experimental: {
        serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "chrome-aws-lambda"],
        serverMinificationGlobals: false
    }
};

export default nextConfig;