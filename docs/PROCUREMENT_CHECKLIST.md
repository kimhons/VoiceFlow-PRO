# VoiceCode Day-1 Procurement Checklist

> Researched 2026-07-11 (cited web research). Ordered longest lead-time first.
> Fire items 1, 2, 3, 6 TODAY — external identity-verification waits nothing can compress.
> Companion to docs/JARVIS_PIVOT_PLAN.md (WS3 desktop pipeline, WS7 mobile).

## 1. Apple Developer Program — org enrollment ⏳ LONGEST POLE (2–7 weeks)
Gates BOTH macOS notarization and iOS App Store.
- Get a **D-U-N-S number** (Dun & Bradstreet, free) for the legal entity.
- Enrol as **Organization** at developer.apple.com — legal name/address/phone must EXACTLY match the D&B record (mismatch is the #1 stall).
- Apple may request notarized business docs + phone callback.
- After approval: create **Developer ID Application** cert (direct .dmg + notarization) and **Apple Distribution** cert (App Store).
- Cost: $99/yr. Wait: D-U-N-S 1–5 business days; org verification officially 1–2 weeks, early-2026 reports 2–7+ weeks.
- Blocks: notarized macOS builds, iOS submission, EAS iOS credentials.

## 2. Windows code signing ⏳ (validation days–weeks + SmartScreen reputation weeks)
- **Recommended: Azure Trusted Signing** — Tauri supports natively. $9.99/mo Basic, unlimited signing.
  - Azure subscription → Trusted Signing account → identity validation (org docs / gov ID) → certificate profile → wire into Tauri Windows signing config + CI.
  - Eligibility: orgs in US/CA/EU/UK; individuals US/CA only. Fallback: OV cert (DigiCert/Sectigo/SSL.com, $200–500/yr, days of validation).
- **Do NOT pay EV premium** — EV stopped bypassing SmartScreen in 2024; reputation accrues from real downloads either way. Start signing/shipping early.
- Blocks: trusted Windows installs + Tauri auto-updater artifacts.

## 3. Google Play Console ⏳ (7–21 days first review)
- $25 one-time. Org identity/D-U-N-S verification now required.
- First submission from a new account: 7–14 days; 14–21 if special-declaration category. Budget the long end.
- Mic gotcha: declare microphone use honestly in the Data safety form; request `RECORD_AUDIO` only when used — mismatch is a common rejection.
- Blocks: Android release of the mobile companion.

## 4. Apple App Store review (iOS) ⏳ 24–48h — after item 1 clears
- Mic apps get fuller human review; pad first submission to a few days.
- **`NSMicrophoneUsageDescription` purpose string mandatory** — missing = auto-rejection ITMS-90683.

## 5. Expo EAS — project + credentials ⏳ hours
- `eas login` → `eas init` in `apps/mobile` → `eas credentials` (EAS manages signing; iOS side waits on item 1; Android keystore automatic) → `eas.json` profiles.
- Free tier OK; Starter $19/mo = priority queue.

## 6. Tauri v1.8 updater keypair ⏳ minutes — do today, before first signed build
- `cargo tauri signer generate -w ~/.tauri/voicecode.key` → private key + `.pub`.
- Public key → `tauri.conf.json` `tauri.updater` (`"active": true`, `endpoints`, `pubkey`).
- CI env: `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (secret manager, e.g. Doppler — never in repo).
- **CRITICAL: back up the private key + password. Losing it = can never update the installed base.** Separate from OS code-signing certs (items 1–2); both needed.

## Sequencing
Fire 1, 2, 3, 6 today. 4 and 5 slot in once 1 clears. Apple org verification is the critical path — clean up the D&B record FIRST.

## Sources
- https://developer.apple.com/help/account/membership/program-enrollment/ · https://www.applefy.tech/blog/apple-developer-program-enrollment
- https://v2.tauri.app/distribute/sign/windows/ · https://melatonin.dev/blog/code-signing-on-windows-with-azure-trusted-signing/ · https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options
- https://capgo.app/blog/first-time-app-review-guide/ · https://www.lowcode.agency/blog/app-store-review-time · https://developer.apple.com/documentation/BundleResources/Information-Property-List/NSMicrophoneUsageDescription
- https://expo.dev/pricing · https://docs.expo.dev/billing/plans/
- https://v1.tauri.app/v1/guides/distribution/updater/
