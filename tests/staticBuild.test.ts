import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const projectRoot = join(import.meta.dir, "..");

describe("static production build", () => {
  test("keeps the Bun development server out of Vercel deployments", async () => {
    const ignoreFile = await readFile(join(projectRoot, ".vercelignore"), "utf8");
    const ignoredEntries = ignoreFile
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    expect(ignoredEntries).toContain("server.ts");
  });

  test("uses the Vercel static preset instead of Node function detection", async () => {
    const config = JSON.parse(await readFile(join(projectRoot, "vercel.json"), "utf8")) as {
      framework?: unknown;
      outputDirectory?: unknown;
    };

    expect(config.framework).toBeNull();
    expect(config.outputDirectory).toBe("dist");
  });

  test("emits deployable HTML, CSS, and bundled JavaScript", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "crazy-arcade-dist-"));

    try {
      const process = Bun.spawn({
        cmd: ["bun", "run", "build"],
        cwd: projectRoot,
        env: {
          ...Bun.env,
          BUILD_MINIFY: "false",
          STATIC_OUT_DIR: outputDir,
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      const [exitCode, stdout, stderr] = await Promise.all([
        process.exited,
        new Response(process.stdout).text(),
        new Response(process.stderr).text(),
      ]);

      expect(`${stdout}\n${stderr}`).not.toContain("error:");
      expect(exitCode).toBe(0);

      const indexHtml = await readFile(join(outputDir, "index.html"), "utf8");
      expect(indexHtml).toContain('href="/assets/styles.css"');
      expect(indexHtml).toContain('src="/assets/main.js"');
      expect(indexHtml).not.toContain("/src/main.ts");
      expect(indexHtml).not.toContain("/src/styles.css");

      const [script, stylesheet] = await Promise.all([
        readFile(join(outputDir, "assets/main.js"), "utf8"),
        readFile(join(outputDir, "assets/styles.css"), "utf8"),
      ]);

      expect(script).toContain("createGameApp");
      expect(script).not.toContain('from "./render/GameApp.ts"');
      expect(stylesheet).toContain(".game-panel");
      expect((await stat(join(outputDir, "assets/main.js"))).size).toBeGreaterThan(1000);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
