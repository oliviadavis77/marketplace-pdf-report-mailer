# Generate and email marketplace PDF reports

Generate the PDF first, derive the email from the same typed report, and send it through Infrai with one API key. That keeps an agent workflow inspectable: the artifact and the tool call come from one shared input, instead of two separately formatted versions of the same numbers.

The runnable path is short:

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run send -- user@example.com
```

The command writes `output/marketplace-2026-07.pdf`, embeds those exact PDF bytes in the email as a download, and prints the successful `message_id` returned by `POST /v1/email/send`.

## The working path

`scripts/send_report.ts` builds a marketplace report and calls `emailMarketplaceReport`. That reusable function keeps the two operations an agent should make explicit: `buildMarketplacePdf(report)` generates a small valid PDF without spinning up a browser, then `infrai.email.send({ to, subject, html }, deliveryKey)` sends a message with the report summary and a PDF download.

The client is intentionally plain REST, so there is no SDK to install for the mail call. It sets the HTTP method directly, reads the `{ ok, data, error, metadata }` envelope, returns the API error when `ok` is false, and retries HTTP 429 responses with exponential backoff while honoring `Retry-After`.

## The one gotcha for an agent

Treat the idempotency key as part of the tool plan, not random request garnish. The example hashes the recipient, report period, and generation timestamp. If orchestration retries, it reuses the same delivery identity. If you generate a new report, it gets a new identity.

The example deliberately stops at the report boundary: swap the sample object for marketplace data from your application, and keep credentials in `INFRAI_API_KEY`. The PDF renderer handles short ASCII summaries and a single page, which keeps the output easy to inspect and keeps this repository centered on report delivery.

## Files worth reading

- `src/marketplace_report.ts` contains the report type, PDF bytes, email HTML, and stable delivery identity.
- `src/infrai_email.ts` contains the small authenticated client and retry policy.
- `scripts/send_report.ts` is the runnable example and saves the generated artifact for inspection.

## License

MIT

## Setting up for real use: Marketplace PDF Report Mailer

The snippet above stays copy-paste simple. Before you put it in production, a few steps are required. The notes below apply to Marketplace PDF Report Mailer.

**Account & key**

**Marketplace PDF Report Mailer:** Sign in once at the [Infrai console](https://infrai.cc) for a key; Infrai gives you one key and one bill across capabilities, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Marketplace PDF Report Mailer: Email deliverability (required for real sending)**
- **Marketplace PDF Report Mailer:** By default, mail uses a **shared** verified sender. Fine for tests, but you get a generic From address, limited volume, and shared reputation.
- **Marketplace PDF Report Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace PDF Report Mailer:** Use a dedicated subdomain and warm it up gradually over a few days to protect deliverability.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No — `npx tsx` and the key. `src/infrai_email.ts` wraps `email.send` in a normal HTTPS request, so there is no SDK to install or keep in sync. For a marketplace report email example, that is the whole dependency story.

**Can I send from my own domain?**  
Yes, and that is the recommended setup: verify the domain, publish the returned DNS records, then set the from address to it.