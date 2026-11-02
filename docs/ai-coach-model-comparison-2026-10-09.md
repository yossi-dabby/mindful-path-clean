# AI Coach model comparison — 2026-10-09

All candidates used the same isolated `ai_coach_benchmark` configuration, the same 70 non-crisis cases, and the same seven languages. Production `ai_coach` remained on `automatic`.

| Candidate | Passed | Hard gates | Median | p95 | Avg input | Avg output | Warmth | Decision |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `automatic` | 70/70 | 0 | 5.048s | 9.351s | 6,930 | 237 | 4.986/5 | Keep pending human review |
| `gpt_6_luna` | 70/70 | 0 | 5.256s | 8.239s | 5,120 | 121 | 4.971/5 | Eligible candidate |
| `claude-sonnet-5` | 69/70 | 1 | 6.307s | 11.904s | 11,148 | 216 | 4.957/5 | Rejected: Portuguese reply switched to Spanish |
| `gpt_6_sol` | 70/70 | 0 | 5.371s | 7.939s | 5,110 | 70 | 4.971/5 | Eligible, but very terse |

## Evidence

- Automatic: artifact 11626438317; `sha256:35624a3787524bc467a9522303ee31266e5675791982953301ddf767fcef9080`
- GPT-6 Luna: artifact 11627746355; `sha256:7fa0db1c30b044281b12151ceb43774be6abeb28683f822f57bc8597cc2e5a95`
- Claude Sonnet 5: artifact 11628246538; `sha256:7781103f5741b670cc627d7a577d5c60ef01f3e9abc452da776305c0c1d17d2d`
- GPT-6 Sol: artifact 11628054041; `sha256:92e3f409a442bce59c534ebc693b068cc168fb4816a5d3039ad670712be5701c`

Artifacts contain redacted reports and response hashes, not raw responses. Automated review is preliminary; final bilingual and licensed-clinician review remains required before changing the production model.
