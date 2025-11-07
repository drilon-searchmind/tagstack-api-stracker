/** @type {import('next').NextConfig} */
const nextConfig = {
  // The `serverExternalPackages` option allows you to opt-out of bundling dependencies in your Server Components.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  
  // Add experimental features for better Vercel compatibility
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
  
  // Ensure proper webpack configuration for Chromium
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@sparticuz/chromium");
    }
    return config;
  },
};

export default nextConfig;
