import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ base: "./", resolve: { alias: { "@": "/src" } }, plugins: [react(), tailwindcss()], build: { target: "es2022" } });
