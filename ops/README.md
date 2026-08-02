# Site operations

The revenue pod is a governed operating specification plus local checks. It does not send messages, mutate a CRM, deploy, change DNS, or perform any other external action.

## Commands

```sh
python3 ops/site_ops.py status
python3 ops/site_ops.py audit .
python3 ops/site_ops.py qualify --business "Example Motors" --locations 2 --problem "Lead routing is inconsistent" --timeline "Within 30 days"
python3 -m unittest discover -s tests
```

`qualify` returns a local JSON brief for Concierge. It does not store or transmit the lead. A human must review any response draft before sending.

## Release path

1. Forge builds and tests a branch.
2. TeeJay reviews the copy, screenshot, and change summary.
3. An exact production action is approved.
4. The change is released.
5. Forge reopens the public URL and verifies HTTPS, critical copy, navigation, and the contact boundary.

The GitHub Actions workflow runs only repository-local guardrails. It does not perform outreach or make production changes beyond any hosting behavior already attached to the repository branch.
