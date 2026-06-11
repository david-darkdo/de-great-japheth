import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro({
      preset: process.env.VERCEL ? "vercel" : undefined,
    }),
    tailwindcss(),
    viteReact(),
    tsConfigPaths(),
  ],
});
