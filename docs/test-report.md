# Test Report — PDF order summary (commit 89bca78)

Run: 2026-10-30, against local build (`npm run build && npm run start`, port 4002, Supabase from `.env.local`).
Precheck: `GET https://automation-store-eta.vercel.app/api/products` = 200 (system up); `http://localhost:4002/api/products` = 200.
Baseline (docs/test-baseline.md): **no tests existed before** → group (ข) "broken before we started" is empty.
No app code and no test code was changed in this round. Local server stopped afterwards.

## Summary

| Suite | Result |
|---|---|
| `npm run test:unit` (CODER, 21 tests) | **21 passed** |
| Playwright e2e (44 tests), run 1 | 24 passed / 20 failed |
| Playwright e2e (44 tests), run 2 | 25 passed / 18 failed + 1 timeout |

Run 1 and run 2 differ because of two flaky causes in the tests themselves (items 2 and 4 below).

**Conclusion: none of the e2e failures is proven to be an app bug. Every failure traced so far is a test-side problem; two product observations (items 1 and 2) are flagged for CODER to look at.**
Note that 3 failure causes mask later assertions in the same tests, so those tests have not yet checked everything they were written to check (see "Not yet verified").

## (ก) Failures after the new feature — cause and verdict

All e2e files are new, so every failure falls in this group. Verdict = who I think is wrong.

### 1. Decomposed "สระอำ" in extracted text → **test wrong (normalisation)**; minor product note
- Affects: pdf-api #1, #2, #6, #7 and pdf-ui #10 "a PDF button on every row" (all in at least one run).
- Evidence: text extracted from the PDF contains `คํา` as U+0E4D U+0E32 (nikhahit + sara aa) instead of U+0E33 (`ำ`). Example from order 162: `ใบสรุปคําสั่งซื้อ`, `การชําระเงิน`, `เลขที่คําสั่งซื้อ#162`. Test expected `ใบสรุปคำสั่งซื้อ` → "Expected substring … Received …คํา…". After replacing `ํา`→`ำ` the heading is found (checked on order 258 PDF).
- All other Thai text matched, the PDF renders correctly (font Sarabun is embedded). This is the normal form emitted by font shaping.
- Product note: copying/searching "คำ" in the PDF will not match. Fixable in the PDF generator if CODER wants (map to U+0E33), otherwise normalise in the helper `tests/e2e/helpers/pdf.js`.

### 2. `UnknownErrorException: bad XRef entry` → **test tooling (pdf-parse's old pdfjs)**; worth CODER's attention
- Affects (intermittently, depends on the order): pdf-api #3 (2nd Day Air, Next Day Air; Ground in run 1), #4, #5, #6b, #8, footer-time.
- Evidence: downloaded 40 PDFs of user 1 via the API and parsed them: 13 failed in `pdf-parse`, exactly every 3rd order id (259, 262, 265 … 295). Compared two PDFs of identical size and layout (258 ok, 265 bad): same xref offset 16647, same object structure, only compressed streams and `/ID` differ. For the failing files: `pypdf` in strict mode reads them fine; every xref entry points at its `N 0 obj`; `startxref` is correct.
- So the file is structurally valid and the failure is in the bundled pdfjs 1.10. Not proven that CODER's output is wrong, but 1 in 3 files being unreadable by an older parser is a risk for other consumers.
- Next step (outside this round): ask CODER whether they can reproduce with another reader; switch test parser to a newer pdfjs (`pdfjs-dist`) or `pypdf`.

### 3. Price parsing bug in the test (`Rs. 500` → 0.5) → **test wrong**
- Affects: regression "add to cart, quantity, totals…" and pdf-ui #8 "every number on the page appears in the PDF".
- Evidence: `Expected: "Rs. 0.5"  Received: "Rs. 500"` — the regex `/[^\d.]/g` keeps the dot of `Rs.` giving `.500`. Same helper `rs()` in pdf-ui.spec.js gives wrong totals so the row lookup `Blue Top` returns undefined.

### 4. Race with the checkout's async profile prefill → **test wrong (flaky)**
- Affects: regression "5 steps…", "card validation" (60 s timeout), "shipping cost…", and in run 1 "place order (Ground, cheque)" (`Expected "QA Reg One"`, page showed `QA Tester`).
- Evidence: error-context shows the alert `Please fill in all required address fields` on step 1 while the fields are all filled after the fact: the test clicked Continue before `/api/auth/me` returned and overwrote the form. In run 1 the prefill also overwrote my typed name.
- Fix is in the test: wait for the prefill (e.g. email field filled) before typing/continuing.

### 5. My Orders column headers are upper-case → **test wrong**
- `Expected ["Order","Date","Items","Total","Status"]  Received ["ORDER","DATE",…]`. `.cart-table th { text-transform: uppercase }` is at app/globals.css:144 and was not touched by 89bca78 (innerText returns the rendered case). Use `textContent`.

### 6. Duplicate `data-qa="logged-user"` → **test wrong**
- regression "UI login works": strict-mode violation, 2 elements (header `src/components/Header.js:30` and the login page panel). Both exist before the change. Scope the locator to `[data-qa="account-panel"]`.

## (ข) Broken before we started
None. Baseline had no tests at all.

## (ค) Passed
- Unit: all 21 (`tests/unit/pdf-format.spec.js`).
- e2e helper self-test: 4/4 (spec §4.2 money, §4.3 Thai date, §4.4 Friday table).
- PDF endpoint: #12 headers (`application/pdf`, attachment, `order-{id}.pdf`, `%PDF-`), #11 401 without login, 401 invalid token, 403/404 other user, 404 unknown id, 400/404 malformed id.
- Button on order detail (#9): label `Download PDF`, file `order-{id}.pdf`, `window.print()` not called (with and without `?placed=1`); `Generating…` + disabled state; `pdf-error` message and retry (§5).
- My Orders: PDF from My Orders equals PDF from detail page.
- UI access control: not logged in (detail and My Orders), other user's order, non-existent order, user 2 sees none of user 1's orders.
- Regression: logged-in user goes to /checkout and cart delete works, address validation message, place order with card (shipping 60, `Paid`, `•••• 1111`) incl. data-qa hooks and `Rs.` currency on the page, and (run 2) place order with cheque (success box, cart cleared, detail unchanged).
- Ground delivery date (#3) matches the weekday rule in at least one run.

## Not yet verified by the tests (masked by failures above)
Manual probe on the PDFs fetched from the local server, to see if those failures hide real defects:
- #5 many items (order with 45 lines): 2 pages, table header on both pages, `หน้า 1 / 2` and `หน้า 2 / 2`, `ยอดสุทธิ` only on the last page, no text outside A4 (OK).
- #6 no phone: no `โทร:` line, no undefined/null (OK; email still shown because server falls back to account email).
- #2 card: shows `••••1234`, no full number (OK). #1 range `4–6 พ.ย. 2569` (OK).
Still to run properly after the test fixes: #3 for all three methods, #4 Thai address, #6b, #7 overflow, #8 amounts (UI), footer time, the full checkout regression steps in items 3–6 above, and My Orders columns.

## Environment notes
- The e2e orders and QA accounts are created in the same Supabase DB the live site uses (same `.env.local` project); account has ~280 orders from repeated runs.
- `npx playwright install chromium` was run (new headless shell downloaded).

---

# Round 1 (fix round — test files only, no app code touched)

Run: 2026-10-30, again against a fresh local build on port 4002. Precheck: `https://automation-store-eta.vercel.app/api/products` = 200; local = 200. Server stopped afterwards.
Only the tests that failed in the first report were re-run (`--last-failed`, 19 tests).

## Changes made (tests/e2e/ only)
| Item | Change |
|---|---|
| 3 price parsing | `rs()` in `pdf-ui.spec.js` and the cart price parse in `regression.spec.js` now strip the `Rs.` label before reading the number (and drop thousands commas) |
| 4 prefill race | `checkoutViaUI` waits for `addr-name` to be filled by the profile prefill; the checkout `beforeEach` waits for `addr-email` to equal the account email before typing/clicking |
| 5 header case | My Orders column headers read with `textContent` (+ trim) |
| 6 duplicate hook | login test scoped to `[data-qa="account-panel"] [data-qa="logged-user"]` |
| 2 parser | `helpers/pdf.js` now uses `pdfjs-dist@4.10.38` (legacy build, dynamic `import()`); `pdf-parse` removed from devDependencies |
| 1 สระอำ | **not changed**, waiting for the user's decision |

## Item 2 result — the "bad XRef" files are fine
All 40 PDFs that were downloaded earlier, including the ones that failed with `pdf-parse` (order 265 and every third id: 259, 262, 268 …), now open without error in `pdfjs-dist` 4.10.38 (40/40 ok, 0 bad); text of order 265 extracts normally. Earlier `pypdf` strict also read them. **This is not a problem in the file**; it was the old pdfjs 1.10 bundled in `pdf-parse`. No action for CODER on this point.

## Results of the re-run (19 tests)
| Group | Result |
|---|---|
| Fixed by this round (12) | pdf-api #3 (2nd Day Air, Next Day Air), #6b, #8, footer time; pdf-ui #8 (on-page amounts vs PDF); regression: add-to-cart/cart totals, UI login, 5 checkout steps, card validation, shipping cost, My Orders columns → **all pass** |
| Still failing only because of the สระอำ (7) | pdf-api #1, #2, #4, #5, #6, #7 and pdf-ui #10 "PDF button on every row" |

In total, after Round 1, every e2e test either passes or fails only on the สระอำ assertion. `place order (Ground, cheque)` and `place order (card)` and the access-control tests were passing in the previous run and were not re-run.

Failing assertions of the 7: text extracted from the PDF has `คํา` (U+0E4D U+0E32) instead of `คำ` (U+0E33), e.g. `Expected "ใบสรุปคำสั่งซื้อ"` / `Expected "จำนวน"` (pdf-api #5, table header) / `Expected "เลขที่คำสั่งซื้อ#345"` (pdf-ui #10). The new parser gives the same text as the old one, so the decomposed form really is in the file's text layer.

## Separate diagnostic for the สระอำ group (not part of the repo)
Because that assertion stops each of the 7 tests early, I ran the whole `pdf-api` and `pdf-ui` specs from a scratch copy outside the repo (`<scratchpad>/diag`) where the helper normalises U+0E4D U+0E32 → U+0E33. Result: **30/30 passed**, including #4 Thai name/address, #5 many items (2 pages, repeated header, page numbers, summary at the end), #6 no phone, #7 long text inside A4, delivery dates, footer time and #10. So the สระอำ form is the only thing that fails in these 7; nothing else is hidden behind it.

## Decision needed (user)
Either (a) CODER emits U+0E33 in the PDF text layer so copy/search of "คำ" works — then the tests stay as they are and pass; or (b) accept it as a font-shaping detail and the test helper normalises U+0E4D U+0E32 → U+0E33 before comparing (the diagnostic above shows this makes all 30 pass).

---

# Round 2 (after c539827 "Extract SARA AM as U+0E33")

Run: 2026-10-30. Precheck: `https://automation-store-eta.vercel.app/api/products` = 200. Fresh `npm run build && npm run start` on 4002 (local `/api/products` = 200). Full suites re-run (not only last-failed). Server stopped afterwards. No app code changed.

## Totals
| Suite | Passed | Failed |
|---|---|---|
| `npm run test:unit` (CODER) | 21 | 0 |
| Playwright e2e (all 4 files) | **44** | **0** |
| **Total** | **65** | **0** |

(After the run I added one assertion to the e2e test #2, see "Card format"; that test was re-run and passes.)

## (ก) Failures caused by the new feature
None.
The 7 tests that failed on สระอำ in Round 1 (pdf-api #1, #2, #4, #5, #6, #7 and pdf-ui #10) now pass with exact comparison (no normalisation in the helper). The PDF text layer now has `คำ` (U+0E33).

## (ข) Broken before we started
None (baseline had no tests).

## (ค) Passed
All of them: 21 unit + 44 e2e, covering spec §6 #1–#12 (content, Thai text, many-items paging, missing phone, long text inside A4, amounts web vs file, button/filename/no-print, `Generating…`, `pdf-error`, My Orders PDF button, 401/403/404) and the §7 regression (cart, login, 5 checkout steps, validations, shipping costs, place order → `?placed=1`, cart cleared, order detail, My Orders columns, data-qa hooks).

## Card format `•••• {card_last4}` (spec §4.1)
The file really contains the space; the "••••1234" in the earlier report came from the test helper, which removes all whitespace before comparing (`norm`).
Evidence (order 361, card ending 1234, via pdfjs-dist): one text item `"วิธีชำระเงิน: Credit Card •••• 1234"`; its code points around the mask are `U+0043 U+0061 U+0072 U+0064 U+0020 U+2022 U+2022 U+2022 U+2022 U+0020 U+0031 U+0032 U+0033 U+0034`, i.e. a U+0020 space between the 4 bullets and the digits. Source agrees: `src/lib/pdf/orderPdf.js:186` builds `` ` •••• ${order.card_last4}` ``.
Because the old assertion could not catch a missing space, I added a raw-text assertion in `tests/e2e/pdf-api.spec.js` (#2): `expect(pdf.text).toContain('•••• 1234')`. It passes.

## Notes
- The e2e orders/accounts live in the same Supabase DB as the live site (about 360 orders for user 1 now).
- Not covered by any automated check: visual look of the Thai glyphs (tofu / mark placement). Worth one manual open of a PDF.
