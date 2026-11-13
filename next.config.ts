import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/login", destination: "/app", permanent: false }];
  },
};

export default nextConfig;
