# QA Automation — Playwright + TypeScript

UI tests against [saucedemo.com](https://www.saucedemo.com) and API tests against [reqres.in](https://reqres.in), using Playwright Test with TypeScript.

## Tests

| # | Scenario | File | Type |
|---|---|---|---|
| 1 | Valid login as `standard_user` shows the "Products" title | `tests/ui/login.spec.ts` | Required |
| 2 | `locked_out_user` sees an error containing "locked out" | `tests/ui/login.spec.ts` | Required |
| 3 | Adding one product shows **1** on the cart badge | `tests/ui/cart.spec.ts` | Required |
| 4 | `GET /api/users/2` returns **200** and `data.email` | `tests/api/users.spec.ts` | Required |
| 5 | `POST /api/users` (morpheus / leader) returns **201** and the name | `tests/api/users.spec.ts` | Required |
| 6 | Removing the product makes the badge disappear | `tests/ui/cart.spec.ts` | Bonus (`@bonus`) |
| 7 | Logging out from the side menu returns to the login page | `tests/ui/login.spec.ts` | Bonus (`@bonus`) |
| 8 | `GET /api/users/23` returns **404** | `tests/api/users.spec.ts` | Bonus (`@bonus`) |

The login steps live in a small Page Object, `pages/LoginPage.ts` (bonus).

## Setup

You need **Node.js 20 or newer**. The brief says 18+, but current Playwright (1.64) requires Node 20.

```bash
cd qa
npm install
npx playwright install chromium
cp .env.example .env     # then paste your ReqRes API key into .env
```

The API tests send the key in the `x-api-key` header. It is read from `REQRES_API_KEY` in `qa/.env`, which is git-ignored, so the key is never committed. Without a key, the API tests are reported as **skipped** with the reason; they are never counted as passed.

## Run

```bash
npx playwright test                    # everything (Chromium + API)
npx playwright test --project=ui       # UI tests only
npx playwright test --project=api      # API tests only
npx playwright test --grep @bonus      # bonus tests only
npx playwright show-report             # HTML report of the last run
npm run typecheck                      # tsc --noEmit (strict)
npm run lint                           # ESLint + typescript-eslint
```

## How it is put together

- **Two Playwright projects** in `playwright.config.ts`:
  - `ui` uses Chromium with `baseURL` set to saucedemo.
  - `api` uses only the `request` fixture, so no browser starts.
- **Locators:** `getByRole`, `getByPlaceholder` and `getByTestId` only. saucedemo uses `data-test` attributes, so `testIdAttribute` is set to `data-test`. The product is chosen by name: `getByTestId('inventory-item').filter({ hasText: 'Sauce Labs Backpack' })`.
- **Assertions:** every test ends with at least one `expect`, using web-first assertions (`toHaveText`, `toBeHidden`, `toHaveURL`) that wait automatically.
- **Every Playwright call is awaited.** ESLint's `@typescript-eslint/no-floating-promises` rule fails the lint if one isn't.
- **API responses** are typed as `unknown` and checked with `toMatchObject`, rather than trusted as `any`.

## Notes from running against the live sites (2026-10-28)

- saucedemo's sidebar "Logout" is an `<a>` element, but the page exposes it with the **button** role, so the test uses `getByRole('button', { name: 'Logout' })`. I found this from the accessibility snapshot Playwright saves when a test fails.
- reqres.in accepted these requests with a valid key, and also **without** a key. An invalid key returned 403. The suite always sends the configured key, as the brief asks.

## Not included (out of scope per the brief)

Other browsers, CI, Docker, custom reporting, checkout/sorting/multi-item flows.
