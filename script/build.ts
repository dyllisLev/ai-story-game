import { build } from "vite";
import { resolve } from "path";
import { build as esbuild } from "esbuild";
import fs from "fs/promises";

const __dirname = new URL(".", import.meta.url).pathname;

async function buildClient() {
  console.log("Building client...");
  await build({
    root: resolve(__dirname, "../client"),
    build: {
      outDir: resolve(__dirname, "../dist/public"),
      emptyOutDir: true,
    },
  });
}

async function buildServer() {
  console.log("Building server...");
  await esbuild({
    entryPoints: [resolve(__dirname, "../server/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: resolve(__dirname, "../dist/index.cjs"),
    external: [
      "express",
      "better-sqlite3",
      "@neondatabase/serverless",
      "express-session",
      "memorystore",
      "multer",
    ],
  });
}

async function copyAssets() {
  console.log("Copying assets...");
  const uploadsDir = resolve(__dirname, "../dist/uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(resolve(uploadsDir, ".gitkeep"), "");
}

async function main() {
  await buildClient();
  await buildServer();
  await copyAssets();
  console.log("Build complete!");
}

main().catch(console.error);
