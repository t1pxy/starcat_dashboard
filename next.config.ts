import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // `mssql` reaches for `tedious`/`msnodesqlv8` through runtime requires that
  // the bundler cannot follow, and `exceljs` pulls in Node stream internals.
  // Load both through native `require` instead of bundling them.
  serverExternalPackages: ["mssql", "exceljs"],
  // `next dev` only serves its own `/_next/*` dev resources to localhost.
  // Colleagues open this over the LAN by IP, so their browser is a different
  // origin and the dev client (HMR, the RSC router) gets 403 — the page paints
  // but nothing on it responds to a click. The office subnet is listed here so
  // a shared dev server behaves the same for them as it does locally.
  allowedDevOrigins: ["172.88.33.*"],
};

export default nextConfig;

