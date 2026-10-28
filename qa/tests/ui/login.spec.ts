import { test, expect } from '@playwright/test';
import { LoginPage, USERS } from '../../pages/LoginPage';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('standard user sees the Products page after logging in', async ({ page }) => {
    await loginPage.login(USERS.standard);

    const title = page.getByTestId('title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Products');
  });

  test('locked out user sees an error', async () => {
    await loginPage.login(USERS.lockedOut);

    await expect(loginPage.error).toContainText('locked out');
  });

  test('user can log out from the side menu', { tag: '@bonus' }, async ({ page }) => {
    await loginPage.login(USERS.standard);
    await expect(page.getByTestId('title')).toHaveText('Products');

    await page.getByRole('button', { name: 'Open Menu' }).click();
    // The sidebar "Logout" item is an <a> but is exposed with the button role.
    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page).toHaveURL('/');
    await expect(loginPage.loginButton).toBeVisible();
  });
});
