import { createServer } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectToDatabase, disconnectFromDatabase, isConnected } from "./db/connect.js";
import { attachRealtime } from "./realtime/realtime.js";

async function main(): Promise<void> {
  if (env.MONGODB_URI) {
    await connectToDatabase();
  } else {
    console.log("[db] kein MONGODB_URI gesetzt — Server läuft ohne Konten");
  }

  const app = createApp();

  // Eigener HTTP-Server statt `app.listen`: socket.io hängt sich daran, Express bleibt der
  // Anfragen-Handler. Ohne Datenbank gibt es keine Sitzungen — dann auch keine Verbindungen.
  const server = createServer(app);
  if (isConnected()) attachRealtime(server);

  server.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[server] received ${signal}, shutting down`);
    server.close();
    await disconnectFromDatabase();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[fatal] failed to start server", error);
  process.exit(1);
});
