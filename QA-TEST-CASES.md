# Workflow verification — 27 September 2026

Tests use synthetic per-test data. They never connect to the configured production database or send real LINE messages.

## Boundaries

Browser tests render the actual Next application and use its actual API client. Playwright intercepts HTTP API requests with mutable fixtures. The Mini App replaces only the external LIFF SDK on an explicitly enabled development E2E server; production builds use the real SDK. API HTTP tests start the actual Nest app with JWT, permission/branch guards, validation and response envelopes, but replace Prisma. Service tests mock external calls.

This verifies the scenarios listed below, not every possible combination or 100% of source code.

## Staging cases not performed against live services

| ID | Steps | Required result | This run |
| --- | --- | --- | --- |
| LIVE-01 | Open room and branch claim links inside LINE on Android/iOS; log in and claim | Correct LIFF channel/branch; cannot reuse room invite | SDK simulated |
| LIVE-02 | Issue invoice, upload to Cloudinary, approve, refresh resident app | Database, storage, receipt, balance and LINE message agree | Boundaries tested separately; no real DB/storage |
| LIVE-03 | Deliver signed webhook and reply from backoffice | Correct inbound/outbound persisted conversation | Signature/dispatch unit-tested; no real delivery |
| LIVE-04 | Concurrent room claims, slip submissions/reviews, refresh rotations on separate DB connections | No duplicate tenancy/payment/receipt or stale balance; one token winner | Service conditions tested; PostgreSQL concurrency unverified |
| LIVE-05 | Compare OA quota/reset with provider dashboard | Quota matches actual OA month | Values mocked; month calculation tested |
| LIVE-06 | Print receipt and select camera/file in LINE on physical devices | Readable print, image permission and upload navigation | Chromium mobile emulation only |

Artifacts: test-results/results.json, playwright-report/index.html, failure screenshot/trace ZIP. Generated artifacts are ignored by Git. Measured results are in QA-RESULTS.md.

## Run from this repository

    pnpm install
    pnpm exec playwright install chromium
    pnpm test
    pnpm test:e2e
    pnpm build
    pnpm typecheck
    pnpm lint

E2E owns port 3152 and .next-e2e. The runner starts Next with windowsHide, captures output in test-results/server.log, stops its own server and restores generated Next configuration. Do not run another server on this port.

## Resident cases

| ID | Starting state / action | Required result |
| --- | --- | --- |
| C01–C04 | Outstanding/empty home, paid/unpaid filters, invoice detail | Correct resident/balance, useful empty state, correct pay link, no overflow |
| C05–C07 | PAID/VOID/DRAFT URL, pending review, partial payment | No repeat submission/nonpayable bill, correct remaining QR balance |
| C08–C10 | Missing input, invalid MIME, valid PNG and transfer time | Invalid inputs never upload; one upload yields pending history and blocks repeat payment |
| C11–C14 | Rejected/approved/empty history, search, receipt link | Reason/receipt retained, filters and empty state correct, link scrolls to bill payment section |
| C15–C17 | API error, missing invoice, QR failure | Visible actionable error, no fake success, submit disabled without QR |
| C18–C22 | LINE logged-out/error/unlinked, valid/expired room invite | Login/retry guidance, protected data not requested when unlinked, success survives re-auth, expired disabled |
| C23–C24 | Legal routes and branch claim; name and entered room | Real route rather than 404; correct branch payload and post-claim home |
| C25–C28 | Upload failure, >8 MB file, theme reload, legacy UUID claim | Retry possible, oversized file blocked, dark mode persists, old branch link supported |

Detailed executable steps/assertions: e2e/resident.spec.ts. Every case runs with fresh data in desktop Chromium and Pixel 7 mobile emulation.

Unit tests: lib/api-client.test.ts, payment-status.test.ts, resident-billing.test.ts, promptpay.test.ts. They cover ID-token exchange, HTTP errors/timeout, multipart token/headers, claim storage, approved-only balance, pending review, rejection/receipt, ordering and QR data.
