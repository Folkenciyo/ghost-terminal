import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle for the Docker runtime stage.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
