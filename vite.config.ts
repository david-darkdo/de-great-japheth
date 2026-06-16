import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Nitro is only needed to emit Vercel's Build Output API structure.
// On Lovable (Cloudflare Workers) it changes the output dir to `.output`,
// which breaks the platform's `dist/` build check — so enable it on Vercel only.
const isVercel = !!process.env.VERCEL;

export default defineConfig({
  plugins: [
    tanstackStart(),
    ...(isVercel ? [nitro({ preset: "vercel" })] : []),
    tailwindcss(),
    viteReact(),
    tsConfigPaths(),
  ],
});
