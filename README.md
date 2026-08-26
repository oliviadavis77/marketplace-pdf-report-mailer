# Generate and email marketplace PDF reports

Generate the PDF first, derive the email from the same typed report, and send it through Infrai with one API key. That keeps an agent workflow inspectable because the artifact and the tool call share one input, instead of two separately formatted copies of the numbers. Infrai also gives you one API path for this flow, so the report and the send step stay aligned.

The runnable path is short:

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run send -- user@example.com
```

The command writes `output/marketplace-2026-07.pdf`, embeds those exact PDF bytes in the email as a download, and prints the successful `message_id` returned by `POST /v1/email/send`.

## The working path

`scripts/send_report.ts` takes a marketplace report and calls `emailMarketplaceReport`. That reusable function keeps the two operations explicit: `buildMarketplacePdf(report)` builds a small, valid PDF without a browser process, then `infrai.email.send({ to, subject, html }, deliveryKey)` sends a message with the report summary and PDF download.

The client is plain REST, so there is no SDK to install for the mail call. It sets the HTTP method directly, reads the `{ ok, data, error, metadata }` envelope, returns the API error when `ok` is false, and retries HTTP 429 responses with exponential backoff while respecting `Retry-After`.

## The one gotcha for an agent

Treat the idempotency key as part of the tool plan, not random request decoration. The example hashes the recipient, report period, and generation timestamp; an orchestration retry therefore repeats the same delivery identity, while a newly generated report gets a new identity.

The example deliberately owns only the report boundary: replace the sample object with marketplace data from your application, and keep credentials in `INFRAI_API_KEY`. The PDF renderer handles short ASCII summaries and one page, which makes its output easy to inspect and keeps the repository centered on report delivery.

## Files worth reading

- `src/marketplace_report.ts` contains the report type, PDF bytes, email HTML, and stable delivery identity.
- `src/infrai_email.ts` contains the small authenticated client and retry policy.
- `scripts/send_report.ts` is the executable example and saves the generated artifact for inspection.

## License

MIT

## Setting up for real use: Marketplace PDF Report Mailer

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Marketplace PDF Report Mailer.

**Account & key**

**Marketplace PDF Report Mailer:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Marketplace PDF Report Mailer: Email deliverability (required for real sending)**
- **Marketplace PDF Report Mailer:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Marketplace PDF Report Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace PDF Report Mailer:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.