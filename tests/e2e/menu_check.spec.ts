import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('http://localhost:5174/#/settings');
  await page.waitForURL(/#\/login/);
  await page.getByLabel(/用户名|Username|用戶名|ユーザー名/).fill('admin');
  await page.getByLabel(/密码|Password|密碼|パスワード/).fill('admin!@#%');
  await page.getByRole('button', { name: /登录|Log in|登入|ログイン/ }).click();
  await page.waitForURL(/#\/risk/);
  await page.goto('http://localhost:5174/#/');
}

test('futures + risk-manage menus visible after login', async ({ page }) => {
  await login(page);
  const sidebar = page.locator('aside').first();
  await expect(sidebar).toBeVisible();
  const links = await sidebar.locator('a').allInnerTexts();
  console.log('SIDEBAR LINKS:', JSON.stringify(links));
  const hrefs = await sidebar.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  console.log('SIDEBAR HREFS:', JSON.stringify(hrefs));
  await expect(sidebar.getByText(/期货交易管理|Futures/).first()).toBeVisible();
  await expect(sidebar.getByText(/风控管理|Risk/).first()).toBeVisible();
  const hasFutures = hrefs.some((h) => (h ?? '').includes('/futures'));
  const hasRisk = hrefs.some((h) => (h ?? '').includes('/risk-manage'));
  console.log('HAS_FUTURES_LINK:', hasFutures, 'HAS_RISK_LINK:', hasRisk);
  expect(hasFutures).toBeTruthy();
  expect(hasRisk).toBeTruthy();
  await page.screenshot({ path: 'test-results/menu-check.png', fullPage: true });
});
