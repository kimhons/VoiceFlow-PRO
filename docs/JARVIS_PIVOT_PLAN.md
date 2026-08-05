# VoiceCode — Jarvis Pivot Ship Plan (DRAFT)

> Status: DRAFT v2 — desktop + web audits complete; mobile + backend audits pending; voice-stack research in flight.
> Goal set by Honour (2026-07-11): finish and ship VoiceCode; pivot to a **Jarvis-style voice agent** — the user talks to the computer to code. Streamline the product around that.
>
> **Decisions from Honour (2026-07-11):**
> 1. **Free launch, payments fast-follow** — WS4 off the critical path.
> 2. **Mobile stays in scope** for this push (which codebase: pending mobile audit). VS Code parked.
> 3. **Real OCR/vision screen context in v1** (not a11y-only).
> 4. **Voice stack: research in progress** — evaluating agentic voice stacks (LiveKit Agents, OpenAI Realtime, Pipecat, Deepgram Voice Agent, Gemini Live, …) rather than hand-assembling STT→LLM→TTS. We are building a voice agent that orchestrates, not voice-only I/O.

## 1. Product thesis

One brain, one conversation. The user speaks naturally; VoiceCode answers fast, edits code, runs longer tasks in the background, and reports back by voice. Inspired by the architecture lesson of Sakana Fugu (single endpoint hiding a learned multi-agent orchestration): **all orchestration complexity lives behind one conversational agent** — never in the UX.

Two latency lanes (this is product architecture, not optimization):
- **Fast lane** (< ~1s to first audio): acknowledge, answer questions, small single-file edits, status of background work.
- **Slow lane**: multi-file refactors, test runs, research. Agent says "on it," works async, reports back; user can interrupt / query progress at any time.

## 2. Scope decisions (streamline)

| Surface | Decision | Rationale |
|---|---|---|
| **Desktop (Tauri)** — `VoiceCode/VoiceCode/apps/desktop` | **THE product.** All v1 effort here. | Jarvis needs mic + screen context + filesystem — only desktop has all three. Rust core compiles clean; agent + batch STT genuinely implemented. |
| **Web** — `VoiceCode/VoiceCode/apps/web` | Demote to account/billing/marketing + download page. No voice-coding features in v1. | Canonical web UI type-checks clean; reuse for the paid-account surface, not the agent. |
| **Mobile** | **IN SCOPE (Honour's call).** Codebase: **`VoiceCode/VoiceCode/apps/mobile`** (audit verdict), re-scoped to a **thin vertical slice** (~20 genuinely wired screens) as the companion app (dictate tasks to the desktop agent, review progress). `VoiceCodeMobile/` standalone is a 7-file skeleton with placeholder EAS creds → archive (WS5). | Audit: 218 suites / 2624 tests pass, but most of the 267 screens are static mockups (only ~53 navigate, ~45 touch services). Full-product store release in 2 weeks not credible; thin slice is. **Verified since (2026-07-11): `tsc --noEmit` 0 errors; `expo export` (iOS) exit 0 — full JS graph Metro-bundles clean (8.48MB Hermes bundle). JS layer provably sound.** Remaining blockers are procurement/infra, not code health: EAS project link, native EAS build, runtime boot proof, RN 0.76 newArch native compat, store accounts + signing + google-services.json. |
| **VS Code extensions** | **Park** (or thin "bridge" later so Jarvis can drive the editor). | Not on the critical path of talk-to-code. |
| Legacy: `voiceflow-pro-ui`, `voiceflow-pro`, `ui-e2e-work` | Deprecate/archive out of the working tree. | Superseded copies; recent work already got misdirected into `voiceflow-pro-ui` once. |

## 3. Workstreams

### WS1 — Real-time voice loop (critical path; the product IS this)
Current state: **live streaming STT is a no-op stub** (`apps/desktop/src-tauri/src/stt/deepgram.rs:385`). Batch path (OpenAI Whisper cloud, Deepgram batch) is real and working.

**Voice-stack research complete (2026-07-11).** Field splits into speech-to-speech models that want to BE the brain (OpenAI Realtime, Gemini Live, Nova Sonic — wrong shape: we own the brain) vs BYO-LLM stacks (Pipecat, LiveKit Agents, Deepgram Voice Agent — right shape). Full comparison in the research report.

**Architecture DECIDED (2026-07-11, verified):**
- **v1: Deepgram Voice Agent API + Cartesia Sonic speak (BYO Cartesia key), direct from Rust.** Single WebSocket from our existing Rust Deepgram client (completes the stubbed streaming path). Deepgram-hosted barge-in + sub-300ms turn-taking + function calling, **BYO-LLM** (our orchestrator stays the brain). Cartesia is a native Deepgram speak provider: set `agent.speak.provider` w/ Cartesia voice ID; supports speed control, `language: multi`, and an **ordered fallback chain** (Cartesia primary → Deepgram Aura fallback). No Python sidecar to bundle/sign/notarize in the window.
- **TTS: Cartesia Sonic 3 / Sonic 3 Turbo** (Honour's pick) — TTFA ~90ms published / ~188ms P50 measured (Turbo ~40ms); WebSocket streaming usable from Rust; instant voice cloning from ~10s audio on all paid plans; pricing Pro $4/mo → Startup $39/mo → Scale $239/mo (credits).
- **Voice options = v1 settings feature:** enumerate Cartesia voice library (+ user's cloned voices) → user picks → set per-session in the Agent Settings message; mid-session switch via UpdateSpeak.
- **v2: Pipecat sidecar** with first-class `CartesiaTTSService` (WS streaming, word timestamps, interruption handling) when we want full pipeline control/self-hosting/local models. **Cartesia Line SDK** noted as v2 alternative (built-in turn-taking, BYO-LLM; newer v0.2, Cartesia-opinionated). Custom pure-Rust loop rejected: turn-taking/barge-in by hand is the hard part and Cartesia's help (Line) is Python-only. LiveKit rejected for v1: room/SFU model too heavy for single-user desktop.
- Do a final Cartesia ToS read before launch (no blocker surfaced).
- **Abstraction requirement:** voice layer behind a `VoiceSession` trait from day one so the Deepgram→Pipecat swap doesn't touch the orchestrator.
- Keep batch path as fallback mode; whisper.cpp local stays OUT of v1.
- Latency budget end-to-end: speech-end → first spoken/visible response.

### WS2 — Orchestrator brain: unified coding-agent orchestration (replace the 13-intent router)
**Vision (Honour, 2026-07-11): orchestrate ALL coding agents in one unified system — maximize each agent's strengths, minimize weaknesses.** VoiceCode is the conductor: voice in → orchestrator decides → dispatches to the best executor → verifies → synthesizes → speaks back. The Fugu lesson applied to coding agents instead of raw models.

Current state: hand-coded 13-intent classifier dispatching to command handlers; coding-agent core is real (LLM-backed, `llm_client::llm_complete`). LangGraph `agent-core` (Python) exists as a separate service.

Staged so v1 ships:
- **v1 (this push): pluggable agent adapters behind one interface.** A common `CodingAgentAdapter` contract (spawn task, stream progress, return diff/result, cancel) with 3 concrete adapters — **DECIDED by adapter survey (2026-07-11):**
  - **Built-in** (existing Rust coding core)
  - **Claude Code** — headless `claude -p --output-format stream-json` (NDJSON events, `--permission-mode`, `--resume` for follow-ups, SIGINT cancel, `total_cost_usd` for cost caps). **ToS pattern (binding): user installs + authenticates their own Claude Code; VoiceCode shells out locally. Never bundle the binary, never proxy Anthropic's API, never resell access.** UI copy: "bring your own Claude Code login."
  - **Codex CLI** — `codex exec --json --sandbox workspace-write --cd <dir>` (JSONL events, sandbox levels, kill-to-cancel). Apache-2.0 — zero licensing ambiguity.
  - Fast-follow #3: **opencode** (ACP server + SDK, model-agnostic). **Gemini CLI de-prioritized** — Google cut consumer-login CLI auth June 2026 (Antigravity migration); revisit via API-key/Vertex auth only.
  - Adapter contract detail: neither CLI emits a patch object — agents edit files in a scoped dir; the **orchestrator derives the diff via git snapshot before/after**. Design the trait around that.
  - Routing v1 is heuristic + user-preference (task type → agent), spoken aloud ("sending this refactor to Claude Code").
- **v1: fast/slow lane dispatch** + conversational state (what each agent is doing, queue, results) — the voice loop answers "how's the refactor going?" at any time.
- **v2 (roadmap): learned routing** — score agents per task type from real outcomes (tests passed, diffs accepted), route on evidence; cross-agent verification (one agent reviews another's diff) — this is the strengths-max/weakness-min mechanism.
- Collapse intent classification into the orchestrator LLM loop: the model decides — answer / edit / dispatch-to-agent / background task — no fixed intent classes.
- Provider-swappable LLM layer for the brain itself (mirror the multi-provider STT pattern; OpenAI-compatible keeps Fugu-style backends open).
- **Privacy constraint (hard):** user code never goes to providers/agents the user hasn't approved; no raw code in telemetry (existing repo rule). Per-agent consent, like the STT provider picker.
- Decide: keep Python `agent-core` as sidecar vs consolidate the loop into Rust. (Leaning: consolidate orchestration in Rust; external agents are subprocesses anyway. Needs ADR.)

### WS3 — Ship pipeline (start IMMEDIATELY — external lead time)
Current state: **cannot ship a build today.** No `tauri build` in CI, macOS signingIdentity null (no entitlements), Windows cert null, updater disabled with empty pubkey.
**Backend audit adds a trap: the only workflow GitHub actually runs is the stale root `.github/workflows/ci.yml` targeting legacy dirs (`voiceflow-pro-ui`, `voice-recognition-engine`, `voiceflow-pro`). The real, strong CI (`VoiceCode/.github/workflows/ci.yml` — type/lint/build, 250KB bundle budget, audit-ci --high, e2e, rust clippy/test) is nested under `VoiceCode/` and NEVER executes.** Nothing meaningful gates merges today; green checks are a false comfort.
- Relocate/point the root workflow at the inner monorepo; delete the legacy workflow; align it to pnpm (it uses npm ci).
- Get product prod-builds green: `verify.md` (2026-07-03) reports web + desktop prod builds ELIFECYCLE-fail and api tests failing (mobile jest has since been fixed — 2624 tests pass as of today's audit). Re-verify and fix.
- Procurement + signing + updater: see `docs/PROCUREMENT_CHECKLIST.md` (day-1 items: Apple org enrollment 2–7wk critical path, Azure Trusted Signing, Play Console, updater keypair).
- Note: `infrastructure/` and `installation-packages/` are empty skeletons — no deploy target exists yet for edge functions/web either.
- Day 1: enroll/verify Apple Developer ID + start Windows code-signing cert procurement (multi-day external wait; cannot compress).
- CI job: `tauri build` producing signed installers (macOS notarized DMG, Windows MSI/NSIS; Linux AppImage optional).
- Generate updater keypair, enable updater, stand up release feed. Non-negotiable for post-launch fixes.
- Microphone + screen-recording entitlements/permission flows on macOS.

### WS4 — Backend + payments (FAST-FOLLOW, off critical path per decision #1)
**Backend audit (2026-07-11): payments are genuinely implemented, not stubs** — real Supabase migrations (profiles w/ subscription_tier, subscriptions, payments; RLS on, subscription writes service_role-only), complete edge functions (checkout, payment-intent, portal, signature-verified Stripe webhook writing subscription state), real client services in web+mobile. The free-launch decision is validated: desktop runs with no backend; payments are a true fast-follow (mainly deploy + verify).
- **Two defects to fix before ANY billing goes live:**
  1. `supabase/functions/create-portal-session/index.ts:8` — bad import (`createClient` not exported by `_shared/supabase.ts`); portal function fails at runtime.
  2. **SECURITY:** `apps/web/src/contexts/AuthContext.tsx:209,274` — demo mode hard-codes `subscription_tier:'enterprise'` / `role:'superuser'`; a free-enterprise/priv-esc bypass if demo mode is reachable in prod.
- **Never deployment-verified:** deploy edge functions, set webhook secret + price-ID envs, smoke-test checkout → webhook → tier flip → portal against Stripe test mode.
- Also: `handleInvoicePaymentSucceeded` is a no-op log. `apps/api` is a peripheral alert/notification API (not payments). GitHub issues #2 (high npm vulns) + #3 (bundle size) block the (currently unwired) CI gates.

### WS5 — Streamline the repo (cheap, do early, prevents misdirected work)
- Mark `voiceflow-pro-ui` DEPRECATED (README banner) or archive out of tree; verify nothing from its recent TS-fix/Playwright push needs porting to `apps/web`.
- Archive `voiceflow-pro/` and `ui-e2e-work/` out of the working tree.
- **Archive `VoiceCodeMobile/` standalone** — audit found a 7-file skeleton (empty services/components/hooks dirs, placeholder EAS creds `your-apple-id@example.com`, fake projectId). `apps/mobile` is the one true mobile codebase.
- Finish `apps/web` rebrand (README still says "VoiceFlow Pro UI Components").
- Resolve branch `fix/mobile-placeholder-tests`: tests pass (218 suites / 2624 tests) but assert mock contracts — merge as test-infra work, don't read it as product completeness.
- **Delete dead service dirs** (backend audit): `services/ai-processor` (empty — only .pytest_cache) and `services/voice-engine` (only compiled dist/, no src). `services/agent-core` is real (4,233 LOC, Dockerfile, tests) but OFF the desktop critical path (desktop does STT + agent in-process in Rust) — keep as the WS2 orchestrator's reference/experiment, don't deploy for v1.
- Delete the stale root CI workflow as part of the WS3 CI relocation.

### WS6 — Screen context: real vision (DECIDED — Honour picked real OCR/vision for v1)
Current state: OCR is a tesseract placeholder (`computer_vision.rs:835`); vision LLM analysis step is a placeholder (`vision/computer_use.rs:500`).
- Pragmatic implementation of "real vision": **screen capture → multimodal vision LLM** (fills the `vision/computer_use.rs:500` placeholder) — far less work than building the tesseract pipeline and strictly more capable. Local tesseract OCR optional later for offline/cost.
- Supplement with accessibility APIs for the active editor where available (structured text beats pixels for code).
- Privacy: capture respects privacy-mode windows; captures go only to user-approved vision providers; never logged raw (existing repo rules).

### WS7 — Mobile companion thin slice (inventory complete, 2026-07-11)
~21 screens across 4 jobs (paths relative to `apps/mobile/src/`). Full details in the inventory report; navigator trims: MainNavigator → Home/Library/Settings/Profile tabs only (drop Explore + Enterprise).
- **Job 1 Auth/onboarding (6 screens, ~80% there):** Splash/Onboarding/Permissions + Login/Signup/Forgot. Two real gaps: login screens dispatch Redux `loginSuccess` directly with **no real `supabase.auth.signInWithPassword`** (plumbing already exists in `contexts/AuthContext.tsx` — wire it); `PermissionsScreen` SIMULATES permission grants (`// TODO`) — needs real expo-av/notifications calls.
- **Job 2 Voice dispatch to desktop (the core build — net-new but seeded):** NO working screen today. Seeds: `screens/home/RecordingScreen.tsx` has REAL audio capture (AudioRecorder + WebSocketStreamingService) but is unreachable (`navigation/HomeNavigator.tsx:54` routes "Recording" to HomeScreen — TODO); `contexts/AgentContext.tsx` + `AgentFAB` already POST to `/agent/chat`/`/agent/command`, text-only, generic backend. Build: one new DispatchScreen = RecordingScreen capture + AgentContext send, pointed at the desktop agent.
- **Job 3 Progress/results (3–4 screens, second real build):** adapt `ChatScreen` as the agent task feed; `LibraryListScreen`/`TranscriptDetailScreen` already wired via supabaseService. No dedicated task-status screen exists — extend AgentContext state.
- **Job 4 Settings (7 screens, mostly real):** Settings hub + Account/Privacy/Recording/About; `ChangePasswordScreen` + `DeleteAccountScreen` both use real supabase.auth.
- **Architecture implication (feeds WS2/WS4):** dispatch-to-desktop needs a mobile↔desktop transport. Simplest v1: a **Supabase-relayed task queue/realtime channel** (backend already exists and is user-authed) — desktop agent subscribes, mobile publishes. This adds one small backend requirement to the otherwise backend-free launch; design it inside WS2's task model so mobile is just another client of the orchestrator.

## 4. Sequencing sketch (aspirational 2 weeks; scope wins over date per Honour)

- **Days 1–2:** WS3 cert procurement kicked off · WS5 repo streamline · WS1 Deepgram WS spike proving live partial transcripts in-app.
- **Days 3–7:** WS1 streaming + TTS + barge-in hardened · WS2 orchestrator loop replacing intent router (fast lane first) · WS3 CI installer builds green (unsigned → signed as certs arrive).
- **Days 8–11:** WS2 slow lane + background tasks · WS4 payments + entitlement gating · WS6 screen-context v1 (Option A).
- **Days 12–14:** end-to-end dogfooding of the full voice loop, latency tuning, signed/notarized installers, updater verified, launch checklist.
- **Honest risk:** Windows cert issuance and Apple notarization setup can individually blow past this window; WS1 latency tuning is genuinely hard. Slippage lands on the date, not the scope (per decision).

## 5. Open decisions

Resolved 2026-07-11: ~~monetization~~ (free launch), ~~screen context~~ (real vision), ~~park-list~~ (mobile IN, VS Code parked).
Still open:
1. **Voice stack** — **TTS DECIDED (Honour, 2026-07-11): Cartesia Sonic, with user-selectable voice options.** Verification in flight: whether Deepgram Voice Agent supports Cartesia as speak provider; if not, the loop architecture shifts (custom Rust loop w/ Cartesia WS TTS, or Pipecat sidecar with native Cartesia support from day one). Staged Deepgram→Pipecat rec under re-evaluation against the Cartesia constraint.
2. Python agent-core sidecar vs Rust-consolidated orchestrator (ADR — Claude to draft, Honour to sign off). Note: Deepgram-v1 voice path removes the strongest argument for a Python sidecar in v1.
3. Mobile companion v1 feature set — which ~20 wired screens make the thin slice (inventory in progress).
4. ~~v1 adapters~~ DECIDED: built-in + Claude Code (BYO-auth local) + Codex CLI; opencode fast-follow; Gemini CLI deferred (consumer CLI auth cut June 2026).

## 6. Pending inputs

- [x] Mobile audit → `apps/mobile` thin slice; archive standalone; JS layer verified sound (tsc 0 errors, Metro export exit 0). (2026-07-11)
- [x] Voice-stack research → staged Deepgram→Pipecat recommendation. (2026-07-11)
- [x] Backend audit → payments implemented but undeployed + 2 defects; CI never runs (nested); dead service dirs. (2026-07-11)
- [x] Adapter survey → Claude Code (BYO-auth) + Codex CLI. (2026-07-11)
- [x] Procurement research → docs/PROCUREMENT_CHECKLIST.md. (2026-07-11)
- [x] Mobile thin-slice screen inventory → ~21-screen slice, job-2 dispatch is the core build. (2026-07-11)

**ALL PLAN INPUTS COMPLETE (2026-07-11).** Remaining before execution: Honour's voice-stack sign-off + "go."
