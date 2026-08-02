# TeeJay's Tech Tools revenue pod

This repository is operated by five narrow agents under one human approval gate. The source of truth is `ops/agents.json`.

## Shared operating modes

- `read-only`: inspect and report; do not change external state.
- `prepare-only`: create local drafts, branches, previews, tests, and approval packets.
- `execute-approved`: perform only the exact public or production action TeeJay Crawford approved, then verify the destination.

## Non-negotiable boundaries

- Never send email, contact a lead, post publicly, write to a CRM, charge a payment method, change DNS, or deploy production without exact human approval.
- Never call a dashboard interaction a sale. Economic claims require an authorized source and a recorded coverage boundary.
- Keep `prototype`, `local`, `staged`, `deployed`, and `public/live` distinct.
- Never put client private data, credentials, customer records, or secrets in this repository, analytics, fixtures, screenshots, or reports.
- Public proof must be anonymized unless the client explicitly approves the name and exact claim.
- Any person represented as TeeJay must use an exact user-approved photo of TeeJay Crawford. Never generate a human stand-in.

## Release check

Run `python3 ops/site_ops.py audit .` and `python3 -m unittest discover -s tests` before requesting production approval. After an approved production release, verify the public URL, HTTPS, critical copy, navigation, and form boundary.
