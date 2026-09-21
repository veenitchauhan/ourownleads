# Our Own Leads

Local beta of a lead CRM and WhatsApp workspace. Built with Next.js, React, TypeScript, shadcn UI, and SQLite. The public homepage uses a B2B-focused teal and sage identity.

## Run

Node 22.13+ required (tested on Node 26.8.2). Install with `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. Production: `npm run build` followed by `npm start`. The local server listens only at 127.0.0.1:3100.

This Mac serves the app at **https://ourownleads.test** through Apache. The `com.ourownleads.portal` LaunchAgent starts the production server at login. After rebuilding, restart it with `launchctl kickstart -k gui/501/com.ourownleads.portal`.

Apache configuration and LaunchAgent templates are in `deploy/`. The previous Laravel vhost is backed up at `/opt/homebrew/etc/httpd/extra/ourownleads.test.conf.before-our-own-leads-crm`; its project files remain untouched. HTTP redirects to HTTPS, and Apache restricts access to local clients.

## Working features

- Account registration/login/logout with hashed passwords and server-side sessions.
- Isolated per-account workspaces, saved lead records, stages, notes, search and CSV export.
- Manual leads, CSV import with column mapping and duplicate checking, accessible Google Sheets links, or pasted private-sheet cells.
- Top-right account dropdown for settings, logo, accent color and logout.
- Saved knowledge entries, source search and assistant preferences.
- Developer connection of an existing Meta Cloud API number, encrypted tokens, approved text-template initiation, inbound message storage, and delivery status handling.

No sample lead records are placed in real accounts. The public homepage illustration is explicitly marked as sample data.

## WhatsApp setup

Provide your own Meta WABA ID, phone-number ID and authorized system-user token through the connection screen. Tokens are verified against the WABA and encrypted at rest. Configure `CREDENTIAL_ENCRYPTION_KEY` for production. Local development generates a private key in `data/credential.key`.

Webhook endpoint: `/api/webhooks/whatsapp`. Set `META_APP_SECRET` and `META_VERIFY_TOKEN`, configure Meta's callback URL and subscribe the WABA/app to messages. **Meta cannot reach a `.test` local domain.** Inbound messages and delivery receipts require a publicly reachable HTTPS deployment or an explicitly configured development tunnel. The app does not change existing Meta webhooks.

No messages are sent merely by connecting or importing. Outbound initiation requires recorded permission and an approved text template; supported free-text replies require an inbound message within 24 hours. Media/button/named-parameter templates are not supported by this beta. Network-ambiguous sends are marked unconfirmed and are never automatically retried.

## Next production phase

This is a local MVP, not a launched multi-user SaaS. Next steps: managed authentication/email verification and recovery, team roles, Supabase/PostgreSQL migration, backups, background jobs and message reconciliation, Meta Embedded Signup/app review, Google OAuth for private Sheets, an AI provider plus tenant-scoped retrieval and answer evaluation, billing, production monitoring, privacy/retention controls and abuse protection.

Knowledge search currently returns matching saved sources; it does not generate AI replies or automatically answer WhatsApp messages. Assistant preferences are stored for the next integration phase.

SQLite data and local credentials live in ignored `data/`. Preserve the encryption key with encrypted backups; never commit credentials or the database.

## Validation

`npm test` checks CSV parsing, consent/deduplication, phone normalization, 24-hour boundaries and safe Sheets URLs. `node tests/api-smoke.mjs` checks a running local server using temporary accounts and removes only those accounts afterward; it sends no external messages. `npm run build` includes TypeScript validation.

## Customer WhatsApp onboarding

Customers use `/whatsapp` → Connect WhatsApp → Meta Embedded Signup. They never enter API identifiers or tokens. This initial flow supports a new number (not already registered with a WhatsApp app); coexistence/migration is not yet implemented. Meta's v4 Facebook Login for Business configuration selects the WhatsApp Embedded Signup variation. The SDK only loads on the WhatsApp page when platform setup is enabled.

Set `ADMIN_PASSWORD` in the server environment, restart, and sign in at `/admin` using username `admin`. This uses a dedicated administrator session; it does not create a customer workspace. Alternatively, `PLATFORM_ADMIN_USER_IDS` can identify existing trusted accounts by immutable user ID. Signup/profile input cannot grant this role. The dedicated console lists client cards at `/admin` and app configuration at `/admin/settings`, where the operator saves the Meta app ID, Embedded Signup configuration ID, app secret and webhook verification token. Secrets are encrypted, never returned to the browser, and blank secret fields preserve saved values. Environment values in `.env.example` are the initial fallback until settings are saved.

Before enabling customer connections: deploy to a public HTTPS `APP_URL`, configure Meta's allowed domains and JavaScript SDK login, configure `/api/webhooks/whatsapp` and subscribe to the messages webhook field, and complete Meta app review/required advanced permissions (`whatsapp_business_management`, `whatsapp_business_messaging`, plus any permissions required by your chosen configuration). Confirm these prerequisites in the admin form. This confirmation is an operator attestation, not automated verification of Meta approval or webhook reachability. Local `.test` hosting deliberately remains unavailable for live onboarding. Use a dedicated Our Own Leads Meta app; do not overwrite another product's webhook.

Completion exchanges the authorization code server-side, checks the selected number against the authorized WABA, reserves the number to its workspace, registers it when necessary, subscribes our app, and only then marks the connection complete. Registration PINs and tokens are stored encrypted. Authorization attempts are session-bound, expire after 15 minutes and are single-use. Incomplete setup is persisted as pending and cannot send messages; reconnect retries it. No WhatsApp messages are sent by onboarding. Live Meta onboarding must be acceptance-tested after platform setup; automated local tests do not establish Meta approval or delivery.

Administration uses a separate HttpOnly cookie and session table. Customer cookies cannot authorize admin APIs; admin cookies cannot authorize customer APIs. The historical platform-admin customer row is retained for data preservation but excluded from client listings and blocked from customer APIs. `/platform-settings` redirects to `/admin/settings`. Changing ADMIN_PASSWORD invalidates existing admin sessions after the service reloads the environment.
