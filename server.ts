import "dotenv/config";
import express from "express";
import path from "path";
import dns from "dns";
import { z } from "zod";
import { createServer as createViteServer } from "vite";
import transcribeRouter from "./routes/transcribeRoutes";

// Ensure system environment variables are validated at startup
const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required and cannot be empty."),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("\n❌ Environment configuration error:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  console.error("\nSTABILITY FAILURE: Server startup aborted due to missing GEMINI_API_KEY.\n");
  process.exit(1);
}

// Fix Node.js DNS resolving issue if any
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Main Transcribe API Router (routes/, controllers/, services/)
app.use("/api", transcribeRouter);

// Service runner - boots either Vite Dev Server or Production Static handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Modular Server booted successfully on port ${PORT}`);
  });
}

startServer();
