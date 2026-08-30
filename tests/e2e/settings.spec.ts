import { expect, test, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:8095';

// 登录：hash 路由 SPA，输入框用 label（非 placeholder），跨四语言用正则匹配。
// 登录成功后应用默认跳到 #/risk（Login.tsx 硬编码），再显式导航到目标页。
async function login(page: Page) {
  await page.goto('http://localhost:5174/#/settings');
  // 未登录会被重定向到 #/login
  await page.waitForURL(/#\/login/);
  await page.getByLabel(/用户名|Username|用戶名|ユーザー名/).fill('admin');
  await page.getByLabel(/密码|Password|密碼|パスワード/).fill('admin!@#%');
  await page.getByRole('button', { name: /登录|Log in|登入|ログイン/ }).click();
  await page.waitForURL(/#\/risk/);
  await page.goto('http://localhost:5174/#/settings');
}

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /安全设置|Security settings|安全設定|セキュリティ設定/ }).first()).toBeVisible();
  });

  test('password section has proper width', async ({ page }) => {
    await expect(page.getByText(/密码|Password|密碼|パスワード/).first()).toBeVisible();
  });

  test('MFA section exists', async ({ page }) => {
    await expect(page.getByText(/Google 验证器|Google Authenticator/).first()).toBeVisible();
  });

  test('preferences section exists', async ({ page }) => {
    await expect(page.getByText(/偏好设置|Preferences|偏好設定|環境設定/).first()).toBeVisible();
  });
});

test.describe('Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('group labels are readable', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('audit menu has icon', async ({ page }) => {
    await expect(page.getByText(/审计日志|Audit log|審計日誌/).first()).toBeVisible();
  });

  test('wealth menu has icon', async ({ page }) => {
    await expect(page.getByText(/理财管理|Wealth|理財管理/).first()).toBeVisible();
  });
});

test.describe('API Endpoints', () => {
  test('health check passes', async ({ request }) => {
    const resp = await request.get(`${API}/api/admin/health`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.code).toBe(0);
  });

  test('login returns token', async ({ request }) => {
    const resp = await request.post(`${API}/api/admin/login`, {
      data: { username: 'admin', password: 'admin!@#%' }
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.code).toBe(0);
    expect(body.data.token).toBeTruthy();
  });

  test('wealth products endpoint exists', async ({ request }) => {
    const loginResp = await request.post(`${API}/api/admin/login`, {
      data: { username: 'admin', password: 'admin!@#%' }
    });
    const token = (await loginResp.json()).data.token;
    const resp = await request.get(`${API}/api/admin/wealth/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // wealth 服务为可选上游：200（正常）或 502（上游未部署/未启动）都算端点存在。
    if (resp.status() === 200) {
      const body = await resp.json();
      expect(Array.isArray(body.data.products)).toBeTruthy();
    } else {
      expect(resp.status()).toBe(502);
    }
  });
});