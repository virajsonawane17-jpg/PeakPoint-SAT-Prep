# PeakPoint Prep audit and implementation report

Reviewed October 11, 2026. Static HTML/CSS/JavaScript architecture and Supabase integration preserved. Live homepage reviewed before changes; implementation validated against a local checkout. No production accounts were created and no production records were modified.

## Visual restoration requested by the owner

The original blue gradient/ray hero, headline, typography, pill buttons, rounded cards and oversized footer wordmark were restored after the initial correction pass. Corrected claims, policy drafts, working practice preview and account/progress fixes remain. Desktop and mobile previews were inspected; the browser integration suite and local-link/syntax checks passed. No fabricated statistics or testimonials were restored.

## Confirmed defects and implemented changes

| Files | Issue | Implementation | Validation |
| --- | --- | --- | --- |
| `index.html`, `about.html`, `join.html`, `script.js` | Unsupported audience counters, 40K claim, university associations, invented testimonials, +90–360 outcome graph, nonprofit language, unrelated research copy | Replaced with actual features; removed social-proof widgets and their execution code. About describes the student-founded project without invented milestones. Dedicated diagnostic and AI tutoring are not advertised as available. | Source scan; local-reference checks; desktop/mobile browser review |
| `public.css`, `public.js`, `index.html`, `practice-preview.js` | Overdecorated public pages, unclear product demonstration, excessive animations | Consistent blue brand, cards, headings, navigation, focus states and native FAQ; no continuous canvas on new public pages. Interactive preview loads actual practice data and explanations without account writes. Demonstration analytics explicitly labeled. | Preview answer interaction, mobile menu/Escape, no overflow at 390px, screenshots visually inspected |
| `privacy.html`, `terms.html`, `contact.html`, `account-deletion.html`, `accessibility.html`, public footers and login footer | Missing policy and contact navigation, inconsistent contact email, fake social destinations | Added specific privacy and terms drafts, deletion instructions and accessibility limitations. Footer uses the existing live homepage contact address and independence disclaimer. | Internal links and mobile rendering; data inventory from source |
| `question-bank.js`, `question-list.js`, `study-planner.js`, `analytics-data.js`, `mistakes.js` | Shared browser progress/planner keys; guest fallback could contaminate authenticated accounts | Authenticate before reading practice records; key records by Supabase user ID; remove guest/email fallback reads. Legacy unowned records are deliberately not migrated into anyone's account. | Two-identity browser test; regression tests with shared legacy and guest records |
| `analytics-data.js`, `analytics.js`, `analytics.html`, `dashboard.js`, `dashboard.html` | Analytics read an unused key and incorrect record fields; fabricated score estimates, deltas, study time and static score trend; fixed chart scale | Read real `status`/`saved` practice fields; aggregate sections from actual skill slugs. Scores only reflect self-reported planner inputs. Remove invented time and score improvement; update axis from recorded duration. Loading states replace fabricated metrics. | Empty and populated regression cases; saved/answered integration test; no invented scores or time |
| `saved.html`, `mistakes.html`, `review-records.js` | Hardcoded examples represented as account records | Replace examples with account-specific saved/incorrect records and skill-review links. Empty/error states present. | Practice save → Saved → Analytics; second account sees no first-account records |
| `auth.js`, `login.html`, `password-recovery.js`, `reset-password.html`, `settings.html`, `settings.js` | No recovery UI or local-data deletion; weak client minimum; disabled button on network failure; sign-out and database failures ignored | Eight-character client minimum; recovery email and validated recovery-event update form; network error feedback; checked sign-out errors; auth-event redirect/account-change reload; per-account local clearing; explicit manual server deletion request. Failed server loads and saves produce visible notices. Append bookkeeping advances by inserted batch size. | Mocked signup/confirmation/login/sign-out/persistence tests; mobile signup and recovery-page rendering. Live email delivery not tested. |
| `peakpal.html`, `peaklabs.html`, `peaklabs.js`, `peakpoint-climb.html`, `peakpoint-climb.js`, `peakpoint-style.html` | AI/generation and game prototypes appeared functional; simulated records lacked labels | Clearly label interface prototypes/sample data; disable generation and remove fake completion messages. Direct learners to working question practice. | Source inspection, syntax and destination checks |
| `question-list.js`, `style.css`, `script.js` | Modal keyboard focus could leave dialog; reduced-motion canvas continued running; primary button contrast | Trap modal Tab focus, restore focus after closing, skip canvas with reduced motion, visible focus, darker primary buttons and readable footer. | Browser answer flow; desktop/mobile public review. Full assistive-technology audit remains pending. |
| `supabase-config.js`, `docs/SECURITY-VERIFICATION.sql` | Comment asserted deployed RLS without evidence | Qualify assertion; add read-only SQL inspection of table RLS, policies and deletion foreign keys. | Source review only; SQL was not run against production. |

## Data and infrastructure inventory

- Authentication: Supabase Auth; email/password plus display-name metadata. Browser persists session tokens. Published `sb_publishable_…` client key is intended for public clients, not a privileged service-role secret.
- Database: Supabase PostgreSQL access to `profiles`, `attempts`, `sessions`, `snapshots`, `learning_state`. Only the learning-state schema/policies were present in this repository. Deployed tables and policies could not be verified.
- Browser storage: account-specific question progress, vocabulary mastery/XP, activity events, study-planner inputs and learning fallback. Some learning state is server-backed, but question and vocabulary progress remain local.
- Analytics: application-calculated learning summaries. No third-party advertising/behavioral analytics SDK identified in source.
- AI: no connected AI provider or backend found. PeakPal messages are local DOM content; generation is a prototype.
- Other services: Google Fonts on existing authenticated pages; linked external educational resources. Public pages now use the original Google Fonts configuration, restored at the owner’s request, with system fallbacks.
- Cookies: no application tracking cookies found; provider/hosting behavior unverified.
- Retention: no automatic retention job found. Operational account deletion, backup expiry, log retention, regions and international transfers remain unknown.
- Content: question bank is imported College Board content, not founder-authored questions. Availability does not verify redistribution permission. Operator must review question and linked resource rights.

## Security concerns requiring operator investigation

1. **P0: deployed RLS.** Verify every listed table rejects anonymous access and cross-account reads/writes. A browser user-ID filter is not authorization. Execute the read-only SQL audit and test with two authorized disposable accounts. Do not report the platform as secure based on local tests.
2. **P0: audience/privacy operations.** Confirm operator identity, actual user ages, required age safeguards/parental-consent process, provider retention and deletion handling. No age checkbox or invented compliance claim was added. Legal drafts remain visibly drafts.
3. **P1: content rights.** Review College Board question redistribution and bundled resource permissions before public distribution.
4. **P1: authentication configuration.** Confirm email confirmation, minimum password policy, leaked-password protection where supported, production recovery redirect allowlist, email provider, rate limits and abuse protection in Supabase. Eight-character client validation does not enforce server policy.
5. **P1: stored HTML and browser tokens.** Question prompts/rationales render repository HTML/MathML using `innerHTML`. No new arbitrary user-input HTML sink introduced; reviewed data should still be validated during future imports. CSP and deployment security headers were not verifiable. Local-storage session tokens remain vulnerable to a successful XSS exploit.
6. **P1: account deletion.** Self-service browser clearing works. Server account deletion still requires the operator and should include all user-owned tables, metadata, relevant logs/backups and confirmation. Only learning-state cascading deletion is documented in repository SQL.
7. No privileged API key/private key signature was found by the targeted source scan. This is not a complete secret-history audit, penetration test or security certification.

## Performance findings

- Removed continuous decorative canvas and animation dependencies from new public pages. Shared canvas respects reduced-motion preference.
- Public homepage fetches one skill file for its preview rather than all question files. The full practice app already loads skill files on demand.
- Question data is about 26 MB across skill files; resources are about 146 MB. Large skill payloads and base64 question images warrant measured compression/caching/content-rights review. These assets are not all downloaded on initial public-page load.
- Vocabulary data is a roughly 1 MB script; pagination is present, but transfer size and parse time need real-device profiling.
- Server queries load entire user histories without pagination. Large histories will require incremental fetching and indexes after profiling; blindly limiting rows would make totals inaccurate.
- Hosting compression/cache headers, actual API latency, throttled-device metrics and Core Web Vitals were not measured. No performance score is claimed.

## Tests performed

- All root JavaScript files and inline HTML scripts parsed successfully.
- Every local HTML `href`/`src` destination checked: no missing local files.
- Source scans for the specified audience claims, outcomes, university testimonial associations and nonprofit copy; unsupported public claims removed.
- `tests/regression.cjs`: account isolation, actual bank schema aggregation, empty-account metrics, self-reported scores, invalid email/weak password, confirmation-required signup, rejected login, sign-out failure, local record removal, append bookkeeping and failed-save feedback.
- `tests/browser.cjs`: actual preview question/feedback; mobile navigation/Escape; public-page overflow; practice answer and saved record persistence; Saved and Analytics rendering; second-account isolation; no page errors. Authenticated identities are mocked solely in the local test browser.
- Desktop 1280px and mobile 390px screenshots inspected. New public pages checked at mobile width; mobile registration and recovery pages rendered without horizontal overflow.
- Git whitespace validation.

Reproduce logic checks with `node tests/regression.cjs`. Browser checks require Playwright, an installed compatible browser and a local static server; set `PEAKPOINT_TEST_URL` and optionally `PEAKPOINT_CHROME`. No new runtime dependency is required by the website.

## Production scenarios still pending

| Scenario | Status |
| --- | --- |
| New user registration and successful login | Client logic reviewed/mocked; production registration not executed |
| Existing email registration | Provider errors mapped; production duplicate behavior and confirmation privacy settings need verification |
| Invalid email / weak password | Client regression checks pass; server policy pending |
| Password reset / email verification | UI and provider API wiring implemented; delivered email links, redirect allowlist and token expiry need live verification |
| Session expiration / sign-out | Initial session gate and auth-event redirects implemented; provider expiration behavior needs live test |
| Account deletion | Per-account browser removal tested; server deletion is manual and operationally unverified |
| Mobile registration | Rendering checked; production signup not executed |
| Cross-account database access | Browser-storage isolation tested; database RLS still requires authorized two-account verification |

## References used for review

- Supabase password recovery: https://supabase.com/docs/guides/auth/passwords
- FTC COPPA scope: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
- FTC operator guidance: https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-not-just-kids-sites

These sources informed recovery wiring and the review checklist. Applicability to this operator and audience has not been legally determined.
