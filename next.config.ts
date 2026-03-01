import type { NextConfig } from "next";
import WebpackLicensePlugin from "webpack-license-plugin";

const CLIENT_LICENSE_REPORT = "oss-licenses-client.json";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.plugins = config.plugins ?? [];
      config.plugins.push(
        new WebpackLicensePlugin({
          outputFilename: CLIENT_LICENSE_REPORT,
          includeNoticeText: true,
        })
      );
    }

    return config;
  },
};

export default nextConfig;
