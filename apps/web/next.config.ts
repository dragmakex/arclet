import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["@arclet/domain", "@arclet/policy", "@arclet/graph", "@arclet/circle", "@arclet/chain", "@arclet/agent", "@arclet/db"]
};
export default nextConfig;
