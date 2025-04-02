import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  try {
    // For local development use 'localhost' instead of '0.0.0.0'
    // This avoids the ENOTSUP error on some Windows systems
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    // Remove reusePort option for better cross-platform compatibility
    server.listen({
      port,
      host
    }, () => {
      log(`serving on ${host}:${port}`);
    });
  } catch (error: any) { // Type assertion for error
    console.error('Failed to start server:', error);
    // If the specified port fails, try an alternative
    if (error.code === 'ENOTSUP' || error.code === 'EADDRINUSE') {
      const altPort = 3000;
      console.log(`Attempting to use alternative port: ${altPort}`);
      server.listen(altPort, 'localhost', () => {
        log(`serving on localhost:${altPort} (alternative port)`);
      });
    }
  }
})();
