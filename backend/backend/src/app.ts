import path from "path";
import cors from "cors";
import express, { Request } from "express";
import helmet from "helmet";
import passport from "./config/auth/passportConfig";
import { config } from "./config";
import { auditRequest } from "./middlewares/audit.middleware";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware";
import { requestLogger } from "./middlewares/logger.middleware";
import { apiRouter } from "./routes";

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buffer) => {
        (req as Request).rawBody = Buffer.from(buffer);
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(passport.initialize());
  app.use(requestLogger);
  app.use(auditRequest);
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  app.use(
    "/generated-reports",
    express.static(path.resolve(process.cwd(), config.reportOutputDir), {
      fallthrough: false,
    }),
  );
  app.use("/api/v1", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
