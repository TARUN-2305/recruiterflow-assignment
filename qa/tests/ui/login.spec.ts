import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('standard user sees the Products page after logging in', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill('standard_user');
    await page.getByPlaceholder('Password').fill('secret_sauce');
    await page.getByRole('button', { name: 'Login' }).click();

    const title = page.getByTestId('title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Products');
  });

  test('locked out user sees an error', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill('locked_out_user');
    await page.getByPlaceholder('Password').fill('secret_sauce');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByTestId('error')).toContainText('locked out');
  });
});
