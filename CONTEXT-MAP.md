# Context Map

## Contexts

- [IslandHub domain](./CONTEXT.md) — the traveler-facing domain: Spots, Hubs, Trips, Routes, safety, routing. The product the repo ships.
- [Ralph loop](./scripts/CONTEXT.md) — the autonomous agent driver that implements `ready-for-agent` issues, gates them, and opens PRs. A dev-tool context, not a product context.

## Relationships

- **Ralph loop → IslandHub domain**: Ralph implements changes to the IslandHub codebase. Ralph's agent reads `CONTEXT.md` and `docs/adr/` to ground its implementations in the domain language. Ralph's own vocabulary (attempts, rounds, gates) is separate and lives in `scripts/CONTEXT.md`.
- **IslandHub domain ↔ Ralph loop**: The domain is unaware of Ralph. Ralph is a consumer of domain docs, not a domain participant.
