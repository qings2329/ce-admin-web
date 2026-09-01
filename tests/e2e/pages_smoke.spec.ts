import { test, type Page, expect } from '@playwright/test';
async function login(page: Page) {
  await page.goto('http://localhost:5174/#/settings');
  await page.waitForURL(/#\/login/);
  await page.getByLabel(/用户名|Username|用戶名|ユーザー名/).fill('admin');
  await page.getByLabel(/密码|Password|密碼|パスワード/).fill('admin!@#%');
  await page.getByRole('button', { name: /登录|Log in|登入|ログイン/ }).click();
  await page.waitForURL(/#\/risk/);
}
test('futures page renders', async ({ page }) => {
  await login(page);
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:5174/#/futures');
  await expect(page.getByText(/期货交易管理|Futures Management/).first()).toBeVisible({ timeout: 8000 });
  // 页面应有持仓/资金费/管理操作 tab
  await expect(page.getByText(/持仓|Positions/).first()).toBeVisible();
  expect(errors.filter(e => !e.includes('favicon'))).toEqual([]);
});
test('risk-manage page renders', async ({ page }) => {
  await login(page);
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:5174/#/risk-manage');
  await expect(page.getByText(/风控管理|Risk Management/).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/规则|Rules/).first()).toBeVisible();
  expect(errors.filter(e => !e.includes('favicon'))).toEqual([]);
});
