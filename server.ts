import { extname, join, normalize } from "node:path";

const root = import.meta.dir;
const port = Number(Bun.env.PORT || 5173);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".ts", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = join(root, safePath);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }

    if (extname(filePath) === ".ts") {
      const result = await Bun.build({
        entrypoints: [filePath],
        target: "browser",
        format: "esm",
        sourcemap: "inline",
        minify: false,
      });

      if (!result.success || result.outputs.length === 0) {
        return new Response(result.logs.map(String).join("\n") || "Build failed", {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      return new Response(await result.outputs[0].text(), {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    }

    return new Response(file, {
      headers: {
        "content-type": mimeTypes.get(extname(filePath)) || "application/octet-stream",
      },
    });
  },
});

console.log(`Crazy Arcade running at http://localhost:${port}`);
