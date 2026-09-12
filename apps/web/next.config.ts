import type { NextConfig } from "next";
const nextConfig: NextConfig = { transpilePackages: ["@arclet/domain", "@arclet/policy", "@arclet/graph", "@arclet/circle", "@arclet/chain", "@arclet/agent", "@arclet/db"] };
export default nextConfig;
