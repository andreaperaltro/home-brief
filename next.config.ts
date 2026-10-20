import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
  outputFileTracingIncludes: { '/api/device/frame': ['./public/**/*', './node_modules/@sparticuz/chromium/bin/**/*', './node_modules/playwright-core/**/*'] },
};

export default nextConfig;
