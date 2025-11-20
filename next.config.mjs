/** @type {import('next').NextConfig} */
const nextConfig = {
  // Replace deprecated experimental option
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer-extra", "puppeteer-extra-plugin-stealth"],

  // Ensure proper Webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@sparticuz/chromium");
    }

    // Suppress Webpack warnings for dynamic requires in clone-deep
    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push({
      module: /clone-deep/,
      message: /Cannot statically analyse 'require\(…, …\)'/,
    });

    return config;
  },
};

export default nextConfig;
