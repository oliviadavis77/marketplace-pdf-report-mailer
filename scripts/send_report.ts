import { mkdir, writeFile } from "node:fs/promises";
import { emailMarketplaceReport } from "../src/marketplace_report.ts";

const recipient = process.argv[2];
if (!recipient) {
  throw new Error("Run npm run send -- user@example.com");
}

const report = {
  period: "2026-07",
  generatedAt: "2026-08-01T09:00:00Z",
  orders: 184,
  grossVolumeCents: 428_950,
  refundsCents: 12_400,
};

const { pdf, delivery } = await emailMarketplaceReport(recipient, report);
await mkdir("output", { recursive: true });
await writeFile(`output/marketplace-${report.period}.pdf`, pdf);

console.log(`Sent report with message_id=${delivery.message_id}`);
console.log(`Wrote output/marketplace-${report.period}.pdf`);
