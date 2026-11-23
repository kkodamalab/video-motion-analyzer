# MediaPipe networking diagnosis — 2026-11-24 JST

The user explicitly declined persistent Chromium CA registration. No CA was registered, no TLS verification was disabled, and no `ignoreHTTPSErrors` or certificate-error bypass was used.

## Observed results in the managed cloud machine

| Layer | Evidence | Conclusion |
| --- | --- | --- |
| CDN JS | curl HTTP 200, TLS verification result 0 | CDN reachable through inherited proxy/CA configuration. |
| CDN WASM | curl HTTP 200, TLS verification result 0 | Binary fetch itself works through curl. |
| Certificate chain | CDN leaf subject `CN=cdn.jsdelivr.net`; issuer `O=OpenAI, LLC, CN=openai.com`; chain includes that self-issued managed CA | The cloud HTTPS proxy supplies a managed certificate chain. This is not evidence of a broken public CDN certificate. |
| Chromium HTTPS | Chromium 156.0.8078.79 with Playwright 1.56.1, inherited proxy selected; CDN JS/WASM fail with `net::ERR_CERT_AUTHORITY_INVALID` | Browser trust differs from curl's managed CA trust. No trust-store change was performed. |
| CDN CORS | Both curl responses advertise `Access-Control-Allow-Origin: *` | No observed CDN CORS misconfiguration. Browser fails at TLS before evaluating CORS. |
| Model and human-image fixture | `storage.googleapis.com` CONNECT rejected with HTTP 403; Chromium reports `net::ERR_TUNNEL_CONNECTION_FAILED` | Destination policy blocks access before origin TLS/CORS. Model/fixture CORS cannot be assessed here. |
| GitHub | Native HTTPS Git read/push work; `gh api repos/kkodamalab/video-motion-analyzer` returns Forbidden; `api.github.com` is absent from enforced custom hosts | API connectivity is separately blocked. Do not interpret successful Git push as successful PR/release API access. |
| Runtime policy | Current environment status reports an enforced restricted policy and empty custom host list | Previously saved host additions remain a draft, not applied runtime access. |

Detailed local evidence: `/workspace/vma-network-diagnosis.json`, `/tmp/vma-certificate-chain.txt`, and `test-results/network-results.json`. Certificate subjects are public chain metadata; no secret values were inspected or copied.

## Implemented response

- Browser MediaPipe paths now use Vite's Pages base URL and **same-origin** `mediapipe/wasm/` and `mediapipe/pose_landmarker_lite.task`; no external CDN fallback.
- Both WASM variants are copied from the integrity-checked, pinned npm package. Real Chromium compiled both successfully without any external browser request.
- Model download moves to `npm run assets:fetch` during setup/CI. It uses ordinary curl with inherited proxy and CA verification, a pinned authoritative version URL, archive checks, and an acquisition SHA-256 receipt. Subsequent use validates the receipt; it is not an independent upstream signature.
- `npm run build` refuses to publish without the verified model. The model has **not** been downloaded in this environment, so a complete production build is currently blocked. Any pre-existing `dist` is from an older build and is not evidence for this revision.
- The existing Google Fonts stylesheet request was removed; system-font fallbacks now avoid an unrelated external browser request.
- E2E projects are separated: deterministic `functional`, genuine same-origin `inference`, and optional upstream `external-network` diagnostics. The normal required E2E command includes functional + inference; the genuine test has not been disabled or replaced by synthetic results.
- CI prepares assets and the human fixture before building/testing. No deployment can proceed unless the required build and genuine-inference test pass.

## Outstanding requirements

Apply `storage.googleapis.com` access in environment settings for verified build-time model and fixture acquisition. Apply `api.github.com` for PR, checks, merge and release operations, and `kkodamalab.github.io` for public-site verification. These domains were already added to the configuration draft; saving a draft did not apply them. No new credential is known to be required; existing authentication must be tried once the route works.

After the policy is applied, run:

```sh
npm run assets:fetch
npm run test:inference:prepare  # curl + FFmpeg; real human still image, not real ballet motion
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Same-origin local inference should not need the browser to trust the external proxy CA, but this remains **unverified until the real model is available**. Public HTTPS browser access may still encounter environment-specific certificate trust problems; record that separately and never label a local replay as live public verification. Persistent CA registration remains disallowed.
