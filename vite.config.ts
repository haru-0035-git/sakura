import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] || "sakura";
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  plugins: [react()],
  base: isGitHubPagesBuild ? `/${repoName}/` : "/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
});
