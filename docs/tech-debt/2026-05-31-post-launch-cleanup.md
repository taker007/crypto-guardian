# Post-Launch Tech Debt — 2026-05-31

Filed during the pre-launch stabilization pass. None launch-blocking;
all queued for investigation after the controlled launch settles.

## CI status — crypto-guardian repo

**Most recent commit:** `8b0eb11` (fix(web): replace Vite-style import.meta.env with Gatsby idiom)

| Job | Status | Notes |
|---|---|---|
| Check workflows | ✅ success | |
| Build, lint, and test / Prepare | ✅ success | |
| **Build, lint, and test / Build** | ✅ **success** | Fixed by `8b0eb11` — was failing pre-fix on `IntelReport.tsx` TS2339 |
| Build, lint, and test / Lint | ❌ **pre-existing failure** | All errors in `packages/api/src/agents/complianceAgent.ts` — Node-builtin import bans + `interface`-instead-of-`type` style rule + import-ordering + `__dirname` use. Was masked by the prior Build failure. |
| Build, lint, and test / End-to-end Test | ❌ **pre-existing failure** | Not yet investigated. Was skipped under the prior Build failure. |
| All jobs pass | ❌ failure | Sum of the two above |

### Launch impact
**Zero.** The Snap ships from npm, not from CI artifacts. Published Snap
`npm:@taker007/crypto-guardian-snap@1.1.3` (published 2026-04-11) is the
artifact users install — that was published before today's CI changes and
is unaffected. The crypto-guardian-web package (where Build now passes) is
a developer test dApp / Gatsby site, not a launch surface.

### Suggested follow-up (post-launch)

1. **Lint cleanup** (`packages/api/src/agents/complianceAgent.ts`) — pick one:
   - Add per-line `eslint-disable-next-line` comments for the Node-builtin imports if the file genuinely needs `fs`/`path`/`http`/`https` (likely is — it's a compliance agent that reads filesystem audit logs)
   - Move the file to a workspace that allows Node builtins, OR carve a `// @eslint-no-restricted-imports-allow-node` exception
   - Fix import ordering and `interface → type` style mechanically
2. **E2E investigation** — pull `gh run view --log-failed` for the latest E2E run, identify the failing test(s), determine if test fixture drift or actual regression
3. **Consider whether `complianceAgent.ts` belongs in `packages/api`** — it appears to be a backend/Node-only utility but lives in a workspace with browser-compatibility lint rules

### Owner / next action
- Assigned: TBD (post-launch)
- Priority: LOW — does not affect npm-published Snap, does not affect production runtime, does not block deploys (no CI gate on crypto-guardian deploy path)

---

## Related items also queued (from stabilization-pass report, 2026-05-31)

Tracked in `crypto-intel/docs/reports/stabilization-pass-2026-05-31.md` §9:

- **R1**: Cache vs live still has 12+6 field-name divergences beyond the
  two fixed (`recommendation` + `summary`). Post-launch cleanup debt.
- **R2**: Elite-critical threat headline override is currently unreachable
  in real-world traffic (intercepted by confidence-UNKNOWN gate). Defensible;
  worth post-launch design review.
- **R3**: snap-platform has two parallel `LATEST_SNAP_VERSION` constants
  (shared vs web). Both bumped; consolidate to single source post-launch.
- **R4**: `/api/intel/report` sync fallback path doesn't apply the
  confidence gate. External-integrations only; no frontend consumer.
- **R7**: `tests/snap-1.1.3.test.js` is a standalone Node script that jest
  mistakenly runs as a test suite. Add to `jest.testPathIgnorePatterns`
  or rename to `*.script.js`.
