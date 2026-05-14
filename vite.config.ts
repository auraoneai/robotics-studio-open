import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { defineConfig, type Plugin } from "vite";

type BabelStandalone = {
  transform(source: string, options: { filename: string; presets: string[] }): { code?: string };
};

function createBabelTransform() {
  const sandbox = {} as {
    Babel?: BabelStandalone;
    globalThis?: unknown;
    self?: unknown;
    window?: unknown;
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  runInNewContext(readFileSync(resolve(process.cwd(), "public/vendor/babel/babel.min.js"), "utf8"), sandbox);

  return (source: string, filename: string) => {
    const code = sandbox.Babel?.transform(source, { filename, presets: ["react"] }).code;
    if (!code) {
      throw new Error(`Babel did not emit JavaScript for ${filename}`);
    }
    return code;
  };
}

function compileBabelSourcesForDesktop(): Plugin {
  const transform = createBabelTransform();

  return {
    name: "compile-babel-sources-for-desktop",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html
          .replace('<script src="vendor/babel/babel.min.js"></script>', "")
          .replace(/<script\s+type="text\/babel"\s+src="([^"]+)"><\/script>/g, (_match, src: string) => {
            const source = readFileSync(resolve(process.cwd(), "public", src), "utf8");
            return `<script>\n${transform(source, src)}\n</script>`;
          })
          .replace(/<script\s+type="text\/babel">([\s\S]*?)<\/script>/g, (_match, source: string) => {
            return `<script>\n${transform(source, "index.html")}\n</script>`;
          });
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), compileBabelSourcesForDesktop()],
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
