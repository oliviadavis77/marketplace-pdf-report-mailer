import { createHash } from "node:crypto";
import { infrai, type SendEmailResult } from "./infrai_email.ts";

export type MarketplaceReport = {
  period: string;
  generatedAt: string;
  orders: number;
  grossVolumeCents: number;
  refundsCents: number;
};

function ascii(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "?");
}

function pdfText(value: string): string {
  return ascii(value).replace(/([\\()])/g, "\\$1");
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function buildMarketplacePdf(report: MarketplaceReport): Buffer {
  const lines = [
    `Marketplace report: ${report.period}`,
    `Generated: ${report.generatedAt}`,
    `Orders: ${report.orders}`,
    `Gross volume: ${money(report.grossVolumeCents)}`,
    `Refunds: ${money(report.refundsCents)}`,
    `Net volume: ${money(report.grossVolumeCents - report.refundsCents)}`,
  ];
  const commands = lines
    .map((line, index) => `BT /F1 ${index === 0 ? 18 : 12} Tf 72 ${740 - index * 34} Td (${pdfText(line)}) Tj ET`)
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`,
  ];

  let document = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n`;
  document += "0000000000 65535 f \n";
  document += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(document, "ascii");
}

function htmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function reportEmailHtml(report: MarketplaceReport, pdf: Buffer): string {
  const pdfData = pdf.toString("base64");
  return [
    `<h1>Marketplace report: ${htmlText(report.period)}</h1>`,
    `<p>${report.orders} orders produced ${money(report.grossVolumeCents - report.refundsCents)} in net volume.</p>`,
    `<p><a download="marketplace-${htmlText(report.period)}.pdf" href="data:application/pdf;base64,${pdfData}">Download the PDF report</a></p>`,
  ].join("");
}

export async function emailMarketplaceReport(
  to: string,
  report: MarketplaceReport,
): Promise<{ pdf: Buffer; delivery: SendEmailResult }> {
  const pdf = buildMarketplacePdf(report);
  const deliveryKey = createHash("sha256")
    .update(`${to}\n${report.period}\n${report.generatedAt}`)
    .digest("hex");

  const delivery = await infrai.email.send(
    {
      to,
      subject: `Marketplace report for ${report.period}`,
      html: reportEmailHtml(report, pdf),
    },
    deliveryKey,
  );
  return { pdf, delivery };
}
