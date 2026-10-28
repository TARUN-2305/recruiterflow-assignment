# ADR-007 — QA automation architecture and secret handling

- **Status:** Proposed (Phase 0)
- **Mandated by brief?** Playwright + TS, Node ≥ 18, the `request` fixture for API tests, the `x-api-key` header, the 5 named scenarios, simple locators, awaited calls, and an `expect` in every test. Structure and config are our choice, guided by the brief's suggested layout.

## Decision

```
qa/
├── tests/ui/login.spec.ts     # A-UI-01, A-UI-02, A-BON-02 (logout)
├── tests/ui/cart.spec.ts      # A-UI-03, A-BON-01 (remove)
├── tests/api/users.spec.ts    # A-API-03, A-API-04, A-BON-03 (404)
├── pages/LoginPage.ts         # A-BON-04 — goto(), login(user, pw), errorMessage
├── playwright.config.ts
├── .env.example               # REQRES_API_KEY=your-reqres-api-key
├── eslint.config.js           # typescript-eslint + no-floating-promises
├── package.json, tsconfig.json, README.md
```

### `playwright.config.ts` — two projects

| Project | testDir | Browser | baseURL | Extra |
|---|---|---|---|---|
| `ui` | `tests/ui` | Desktop Chromium | `https://www.saucedemo.com` | `testIdAttribute: 'data-test'` |
| `api` | `tests/api` | none (only `request` fixture used) | `https://reqres.in` | `extraHTTPHeaders: { 'x-api-key': process.env.REQRES_API_KEY }` (only when set) |

- `npx playwright test` runs both. `npx playwright test --project=ui` runs one.
- Load `.env` with `dotenv` in the config. That is a dev dependency only, and the `.env` file is git-ignored.

### Missing API key behaviour

If `REQRES_API_KEY` is unset, the API spec calls `test.skip(true, 'REQRES_API_KEY is not set — see qa/README.md')`. A reviewer without a key sees **"skipped" with the reason**, rather than a confusing 401 failure. A skip is never reported as a pass, and the README states this plainly.

*Alternative:* fail hard. That is more "honest" in CI, but it makes a fresh clone look broken. **Open for candidate review.**

### Locator strategy (to be verified against the live site in Phase 4)

- Login: `getByPlaceholder('Username')` / `getByTestId('username')`, `getByTestId('password')`, `getByRole('button', { name: 'Login' })`
- Title: `getByTestId('title')` → `toHaveText('Products')`
- Error: `getByTestId('error')` → `toContainText('locked out')`
- Add to cart: `getByRole('button', { name: 'Add to cart' }).first()`. **Alternative:** the specific `getByTestId('add-to-cart-sauce-labs-backpack')`, which is more stable. Decide after inspecting the live DOM.
- Badge: `getByTestId('shopping-cart-badge')` → `toHaveText('1')`; after removal → `toHaveCount(0)` / `not.toBeVisible()`
- Logout: `getByRole('button', { name: 'Open Menu' })`, then `getByRole('button', { name: 'Logout' })`; assert `toHaveURL('/')` and that the login button is visible. *(Verified 2026-10-28: the sidebar "Logout" `<a>` is exposed with the **button** role, not `link`. The first attempt with `link` timed out.)*
- Add to cart: implemented as `getByTestId('inventory-item').filter({ hasText: 'Sauce Labs Backpack' }).getByRole('button', { name: 'Add to cart' })`. It is role-based, and it targets a named product, so the Remove bonus acts on the same item.

### API assertions

- `GET /api/users/2`: `expect(res.status()).toBe(200)`; parse JSON; `expect(typeof body.data?.email).toBe('string')` and that it is non-empty.
- `POST /api/users`: `data: { name: 'morpheus', job: 'leader' }`; `toBe(201)`; `body.name === 'morpheus'`.
- `GET /api/users/23`: `toBe(404)`.
- Response bodies are typed as `unknown` and narrowed. This keeps the TS strict and treats the external API as untrusted (no `any`).

### Isolation and determinism

Each test does its own login (no shared state). `fullyParallel` is safe because SauceDemo keeps cart state per browser context. Retries: 0 locally, so flakiness stays visible. Traces are kept `on-first-retry` (default). No HTML reporter customisation; the default reporter is fine.

## Risks

- **ReqRes behaviour change:** the API-key requirement already changed once; responses may differ again. Phase 4 verifies the live behaviour and documents any deviation honestly.
- **The user must create a ReqRes account and key.** We cannot and will not create accounts.
- SauceDemo availability/DOM changes: verified live in Phase 4.
