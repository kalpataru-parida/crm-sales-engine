import "dotenv/config";
import http from "http";
import app from "./app.js";
import database from "./src/config/db.config.js";

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const start = async () => {
  await database.connect();
  server.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", { name: error.name });
  process.exitCode = 1;
});
