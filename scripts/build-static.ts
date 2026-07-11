import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

interface BuildStaticSiteOptions {
  minify?: boolean;
  outputDir: string;
  rootDir: string;
}

export async function buildStaticSite({ rootDir, outputDir, minify = true }: BuildStaticSiteOptions) {
  const assetsDir = join(outputDir, "assets");

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [join(rootDir, "src/main.ts")],
    format: "esm",
    minify,
    sourcemap: minify ? "none" : "inline",
    target: "browser",
  });

  if (!result.success || result.outputs.length === 0) {
    throw new Error(result.logs.map(String).join("\n") || "Failed to bundle game client");
  }

  const html = await readFile(join(rootDir, "index.html"), "utf8");
  const staticHtml = html
    .replace('href="/src/styles.css"', 'href="/assets/styles.css"')
    .replace('src="/src/main.ts"', 'src="/assets/main.js"');

  if (staticHtml === html) {
    throw new Error("index.html did not contain the expected development asset references");
  }

  await Promise.all([
    writeFile(join(outputDir, "index.html"), staticHtml),
    writeFile(join(assetsDir, "main.js"), await result.outputs[0].text()),
    copyFile(join(rootDir, "src/styles.css"), join(assetsDir, "styles.css")),
  ]);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";

if (invokedPath === import.meta.path) {
  const rootDir = resolve(import.meta.dir, "..");
  const outputDir = resolve(Bun.env.STATIC_OUT_DIR || join(rootDir, "dist"));
  const minify = Bun.env.BUILD_MINIFY !== "false";

  await buildStaticSite({ rootDir, outputDir, minify });
  console.log(`Built static site at ${outputDir}`);
}
