import type { NextConfig } from "next";

// Archivos que el rastreo de Next.js mete en cada función y nunca se usan en Vercel (Linux x64, Postgres,
// motor nativo de Prisma). Achican mucho cada deploy y el "Functions Storage" de Vercel.
const UNUSED_IN_FUNCTIONS = [
  "./node_modules/@prisma/client/runtime/*.wasm-base64.*",
  "./node_modules/@prisma/client/runtime/*{cockroachdb,mysql,sqlserver,sqlite}*",
  "./node_modules/@img/sharp-libvips-linuxmusl-*/**",
  "./node_modules/@img/sharp-linuxmusl-*/**",
  "./node_modules/@img/sharp-wasm32/**",
];

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "/**": UNUSED_IN_FUNCTIONS },
};

export default nextConfig;
