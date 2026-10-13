# MaskPatch

Review candidate personal-detail spans in a draft before choosing what to replace. This local prototype is a privacy rehearsal and text editor, not a safety checker, age verifier, or child-monitoring system.

## Run

Serve this folder using any static HTTP server (for example `python3 -m http.server 8000`), then open localhost:8000 in a current browser supporting ES modules and JSON import attributes. No package installation, API key, build step or paid service is needed. Do not publish private prompts in the source repository. Runtime assets are same-origin static files; the application makes no inference/API request, telemetry call or automatic save.

1. The initial draft is fictional, unscanned and unselected.
2. Click **Find suggestions**. Review each highlighted original span and its **Why?** explanation.
3. Select the candidates you want to replace and click **Mask selected**.
4. Review the entire revised prompt for misses. Copy is explicit; nothing is sent to an AI service.
5. **Restore original** verifies the patch log and restores the exact source. The original editor is never overwritten by masking. Editing the draft invalidates the previous analysis, preview and export.

The optional JSON download contains the original draft and patch log. Keep it private. There is no localStorage, server-side session or recovery after a reload.

## Actual ML and separate rules

`train-model-v2.mjs` trains a multiclass softmax linear token classifier from the included fictional corpus using deterministic SGD. Features include word identity, capitalization, length, digits and nearby token identities. `model-v2.json` stores learned weights; the browser computes actual logits and softmax scores. ML proposes PERSON, SCHOOL and PLACE tokens and merges adjacent same-class tokens. Email/phone-shaped regular expressions are a separate CONTACT pathway. Contact rules take precedence over overlapping ML suggestions; rejected alternatives are retained in the analysis conflict report.

The fixed 0.72 score threshold was not optimized on the holdout. Scores are uncalibrated and do not represent correctness probabilities. NONE and low-score candidates are not automatically replaced. High-confidence false positives, partial spans, whole missing details and language errors are possible.

The 192/64/64 sentence train/validation/holdout split uses disjoint fictional entity identities but **shares grammar templates and repeats generic negative examples**. Its 200/200 accepted-correct entity tokens on the narrow holdout do not establish natural-prompt generalization. A separate four-sentence challenge has 3 correct accepted entity tokens, 1 false positive and 4 missed true entity tokens out of 7 (precision .75, recall about .43). Both misses and mistakes are included in `model-evaluation-v2.json`. English synthetic grammar only; Unicode editing support is not evidence of multilingual entity recognition. No real children, field users or private corpus were used.

## Offset and restoration contract

Offsets are Unicode code-point indices, not UTF-16 offsets, bytes or grapheme clusters. No Unicode normalization occurs. Emoji, CJK, combining marks, CRLF and punctuation remain exact in unchanged source regions. Candidate offsets and source text are checked before applying a selected, nonoverlapping patch set. Rule overlaps are resolved deterministically before review. Restoration checks replacement slices and the full reconstructed source; tampered output or source is rejected.

## Tests and reproduction

Run `node --test test-engine.mjs` on Node 22+ (tested with the available bundled runtime). Ten tests passed for real ML response and ablation, exact demonstration spans, selective/full patches, Unicode offset integrity, contact overlap precedence, stale/duplicate/overlap rejection, JSON round trip/tampering, bounds, independent holdout count reproduction, and visible uncertainty/false positives. Browser interaction, clipboard, download and concept fidelity are pending separate actual-browser QA; Node tests do not establish them.

The training script refuses to overwrite output files. To reproduce, copy `engine.mjs` and `train-model-v2.mjs` into a fresh empty directory and execute the latter. It writes the model, corpus and evaluation JSON with exclusive creation. No downloads or dependencies are used. Older first-pass model/corpus files are preserved locally and excluded from `public-manifest.json`; they are not the runtime or current evaluation. The first pass is not a release.

## Design and AI provenance

Codex authored source code, training examples, model training, explanatory copy and tests. OpenAI ImageGen supplied the UI concept; the shipped UI is HTML/CSS and native controls, not a screenshot. This does not claim unaided participant authorship, participant understanding, enrollment verification, user testing, publication or hackathon submission.

The accepted concept uses a pure white surface, forest actions, apricot spans, mint output, serif wordmark/headline and sans controls. Required functional additions include no-selection initial state, actual runtime errors/status, uncertainty note, optional local JSON export, AI disclosure and method limitations. The checked-three + masked preview is a deliberate user-selected state, not the automatic initial state.

## Scope

At most 4,000 Unicode code points per draft. Plain-text input only; no document import or remote prompt inspection. No guarantee that removing suggestions anonymizes a prompt. Context itself can identify a person. Only synthetic examples should be used for demonstrations. This project has not been registered, uploaded, published or submitted by this build task.
