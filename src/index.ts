import { readConfig } from "./config.js";
import { createAppServer } from "./http.js";
import { createLogger } from "./logger.js";

const config = readConfig();
const logger = createLogger(config.logLevel);
const server = createAppServer({ logger });

server.listen(config.port, () => {
  logger.info("server.started", {
    port: config.port,
    service: "supplier-order-engine-agentic-ai",
  });
});
