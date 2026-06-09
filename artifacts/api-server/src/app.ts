import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { getUploadsDir } from "./lib/uploads-dir";
import { apiReference } from "@scalar/express-api-reference";
import fs from "fs";
import path from "path";
import yaml from "yaml";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads (mesma pasta que upload.ts grava)
app.use("/api/uploads", express.static(getUploadsDir()));

// API Documentation using Scalar
let openApiSpec: any = {};
try {
  const specPath = path.resolve(process.cwd(), "../../lib/api-spec/openapi.yaml");
  const fileContent = fs.readFileSync(specPath, "utf8");
  openApiSpec = yaml.parse(fileContent);
} catch (e) {
  logger.warn("Could not load openapi.yaml for /docs route");
}

app.use("/docs", apiReference({
  spec: {
    content: openApiSpec
  }
}));

app.use("/api", router);

export default app;
