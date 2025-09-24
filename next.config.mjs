/** @type {import('next').NextConfig} */
const nextConfig = {
    // don't bundle these server-only runtime packages
    serverExternalPackages: ["@sparticuz/chromium", "chrome-aws-lambda", "puppeteer-core"],
};

export default nextConfig;