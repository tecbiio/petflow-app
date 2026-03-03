import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true,
    host: true,
    port: 5173,
    allowedHosts: ["www.mypetflow.fr", "mypetflow.fr"],
  },
  preview: {
    strictPort: true,
    host: true,
    port: 5173,
    allowedHosts: ["www.mypetflow.fr", "mypetflow.fr"],
  },
});
