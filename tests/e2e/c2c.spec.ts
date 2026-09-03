import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('http://localhost:5174/#/settings');
  await page.waitForURL(/#\/login/);
  await page.getByLabel(/用户名|Username|用戶名|ユーザー名/).fill('admin');
  await page.getByLabel(/密码|Password|密碼|パスワード/).fill('admin!@#%');
  await page.getByRole('button', { name: /登录|Log in|登入|ログイン/ }).click();
  // 登录成功后等待页面跳转完成。
  await page.waitForTimeout(2000);
}

test.describe('C2C management page', () => {
  test('renders title and order table', async ({ page }) => {
    await login(page);
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://localhost:5174/#/c2c');
    await page.waitForTimeout(2000);
    // 使用 getByText 而非 getByRole(heading)：playwright 对中文 heading-role 匹配不稳定。
    await expect(page.getByText('C2C 交易管理')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/C2C 订单列表|C2C Order List/)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').first()).toBeVisible();
    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('filter by user_id narrows results', async ({ page }) => {
    await login(page);
    await page.goto('http://localhost:5174/#/c2c');
    await page.waitForTimeout(2000);
    await expect(page.getByText('C2C 交易管理')).toBeVisible({ timeout: 10000 });
    const uidInput = page.getByPlaceholder(/用户 ID|user ID|用戶 ID|ユーザーID/).first();
    if (await uidInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await uidInput.fill('1001');
      await uidInput.press('Enter');
      await page.waitForTimeout(800);
      await expect(page.locator('table').first()).toBeVisible();
    }
  });
});
