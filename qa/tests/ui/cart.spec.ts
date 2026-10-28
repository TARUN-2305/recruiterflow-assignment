import { test, expect } from '@playwright/test';

test.describe('Cart', () => {
  test('adding one product shows 1 on the cart badge', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill('standard_user');
    await page.getByPlaceholder('Password').fill('secret_sauce');
    await page.getByRole('button', { name: 'Login' }).click();

    const backpack = page.getByTestId('inventory-item').filter({ hasText: 'Sauce Labs Backpack' });
    await backpack.getByRole('button', { name: 'Add to cart' }).click();

    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
  });
});
