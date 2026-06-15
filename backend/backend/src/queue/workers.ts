import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import mongoose from "mongoose";
import { config } from "../config";
import { NotificationType } from "../constants/status";
import { compileEmailTemplate } from "../helpers/compile-email-template";
import { sendMail } from "../libs/mail";
import { notificationRepository } from "../repository/notification.repository";
import { reportRepository } from "../repository/report.repository";
import { notificationService } from "../services/notification.service";
import { logger } from "../utils/logger";
import { notificationQueue } from "./notification.queue";
import { reportQueue, ReportJobData } from "./report.queue";

notificationQueue.process(async (job) => {
  const html = await compileEmailTemplate(
    job.data.template,
    job.data.variables,
  );
  await sendMail({
    to: job.data.to,
    subject: job.data.subject,
    html,
  });
  if (job.data.notificationId) {
    await notificationRepository.markEmailSent(job.data.notificationId);
  }
});

const loadReportRows = async (data: ReportJobData) => {
  const from = data.filters.from
    ? new Date(data.filters.from)
    : new Date(0);
  const to = data.filters.to ? new Date(data.filters.to) : new Date();
  switch (data.kind) {
    case "stock-movement":
      return reportRepository.stockMovementSummary(
        data.organizationId,
        from,
        to,
        data.filters.warehouseId,
      );
    case "department-consumption":
      return reportRepository.departmentConsumption(
        data.organizationId,
        from,
        to,
      );
    case "stock-status":
      return reportRepository.stockStatus(data.organizationId);
  }
};

const writeExcel = async (
  filename: string,
  rows: Record<string, unknown>[],
) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  const keys = rows.length ? Object.keys(rows[0]) : ["message"];
  sheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(15, key.length + 3),
  }));
  if (rows.length) sheet.addRows(rows);
  else sheet.addRow({ message: "No records found" });
  await workbook.xlsx.writeFile(filename);
};

const writePdf = async (
  filename: string,
  title: string,
  rows: Record<string, unknown>[],
) =>
  new Promise<void>((resolve, reject) => {
    const document = new PDFDocument({ margin: 36, size: "A4" });
    const stream = createWriteStream(filename);
    document.pipe(stream);
    document.fontSize(18).text(title);
    document.moveDown();
    if (!rows.length) {
      document.fontSize(10).text("No records found");
    } else {
      for (const row of rows) {
        document
          .fontSize(9)
          .text(
            Object.entries(row)
              .map(([key, value]) => `${key}: ${String(value)}`)
              .join(" | "),
          );
        document.moveDown(0.5);
      }
    }
    document.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

reportQueue.process(async (job) => {
  const rows = (await loadReportRows(job.data)) as Record<string, unknown>[];
  const outputDir = path.resolve(process.cwd(), config.reportOutputDir);
  await mkdir(outputDir, { recursive: true });
  const filename = `${job.data.kind}-${job.id}-${Date.now()}.${job.data.format}`;
  const outputPath = path.join(outputDir, filename);
  if (job.data.format === "xlsx") {
    await writeExcel(outputPath, rows);
  } else {
    await writePdf(outputPath, job.data.kind, rows);
  }
  await notificationService.notifyUser({
    organizationId: job.data.organizationId,
    userId: job.data.requestedBy,
    type: NotificationType.REPORT_READY,
    title: "Inventory report ready",
    message: `${job.data.kind} has finished generating.`,
    template: "reportReady",
    variables: {
      reportName: job.data.kind,
      reportUrl: `${config.appUrl}/generated-reports/${filename}`,
    },
  });
  return { outputPath };
});

notificationQueue.on("failed", (job, error) => {
  logger.error("Notification job failed", { jobId: job.id, error });
});
reportQueue.on("failed", (job, error) => {
  logger.error("Report job failed", { jobId: job.id, error });
});

logger.info("Queue workers started");

void mongoose
  .connect(config.mongoUri)
  .then(() => logger.info("Queue worker connected to MongoDB"))
  .catch((error) => {
    logger.error("Queue worker failed to connect to MongoDB", { error });
    process.exit(1);
  });

const shutdown = async () => {
  await Promise.all([
    notificationQueue.close(),
    reportQueue.close(),
    mongoose.disconnect(),
  ]);
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
