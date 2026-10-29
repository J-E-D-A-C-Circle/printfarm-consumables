import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost",
        "localhost:80",
        "localhost:3000",
        "127.0.0.1",
        "127.0.0.1:80",
        "127.0.0.1:3000",
        "192.168.*.*",
        "192.168.*.*:80",
        "192.168.*.*:3000",
        "10.*.*.*",
        "10.*.*.*:80",
        "10.*.*.*:3000",
        "172.16.*.*",
      ],
    },
  },
};

export default nextConfig;
