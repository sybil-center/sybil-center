/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // config.resolve.extensionAlias = {
    //   ".js": [".ts", ".tsx", ".js"],
    // };
    return config;
  },
};

module.exports = nextConfig;
