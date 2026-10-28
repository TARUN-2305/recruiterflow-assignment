import { test, expect } from '@playwright/test';
import { LoginPage, USERS } from '../../pages/LoginPage';

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(USERS.standard);
  });

  test('adding one product shows 1 on the cart badge', async ({ page }) => {
    const backpack = page.getByTestId('inventory-item').filter({ hasText: 'Sauce Labs Backpack' });
    await backpack.getByRole('button', { name: 'Add to cart' }).click();

    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
  });

  test('removing the product makes the cart badge disappear', { tag: '@bonus' }, async ({ page }) => {
    const backpack = page.getByTestId('inventory-item').filter({ hasText: 'Sauce Labs Backpack' });
    const badge = page.getByTestId('shopping-cart-badge');
    await backpack.getByRole('button', { name: 'Add to cart' }).click();
    await expect(badge).toHaveText('1');

    await backpack.getByRole('button', { name: 'Remove' }).click();

    await expect(badge).toBeHidden();
  });
});
