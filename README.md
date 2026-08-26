# ce-admin-web

Crypto Exchange 管理后台前端（Web Admin Console）。

基于 **React 18 + TypeScript + Vite 5** 构建，遵循 Binance 设计语言（Midnight Black 暗色主题、高数据密度布局）。

包名：`crypto-exchange-web-admin` · 版本：`0.1.0`

---

## 技术栈

- **React 18.3** + **TypeScript 5.5**
- **Vite 5.4**（开发服务器、构建、预览）
- 轻量级自研 **i18n**（zh-CN / en-US / zh-TW / ja-JP，无第三方依赖）
- **Hash 路由**（`location.hash`），未使用 react-router
- 样式：Tailwind CSS 实用类（遵循 `AGENTS.md` 中的 Binance 设计规范）

---

## 目录结构

```
ce-admin-web/
├── index.html
├── vite.config.ts          # 端口 5174，代理 /api/admin -> localhost:8095
├── tsconfig.json
└── src/
    ├── App.tsx             # Hash 路由 + PAGES 路由表 + AuthProvider
    ├── api/
    │   └── client.ts       # 统一 API 封装（api.* 方法 + 类型）
    ├── lib/
    │   ├── auth.tsx        # AuthProvider / useAuth / 登录态 & 权限
    │   ├── theme.tsx       # 主题（暗色）
    │   ├── timezone.tsx    # 时区显示
    │   ├── useFetch.tsx    # 请求 Hook
    │   └── usePaged.tsx    # 分页 Hook
    ├── components/
    │   ├── ApiTable.tsx    # 通用表格（粘性表头 / 固定行宽 / 悬浮高亮）
    │   ├── NavBar.tsx      # 侧边/顶部导航
    │   └── Pager.tsx       # 分页器
    ├── i18n/
    │   └── index.tsx       # 多语言（t(key, vars?) 插值）
    └── pages/              # 21 个页面
```

### 页面路由（PAGES 映射）

| 路由 | 页面 |
|------|------|
| `/login` | 登录（特殊路由，未认证时重定向至此） |
| `/dashboard` | 总览 |
| `/risk` | 风控 |
| `/users` | 用户管理 |
| `/symbols` | 交易对 |
| `/ops` | 运营 |
| `/deposits` | 充值 |
| `/chains` | 链管理 |
| `/coins` | 币种 |
| `/admins` | 管理员 |
| `/roles` | 角色 / RBAC |
| `/settings` | 系统设置 |
| `/announcements` | 公告 |
| `/notifications` | 通知 |
| `/orders` | 订单 |
| `/audit` | 审计日志 |
| `/apikeys` | API Key |
| `/deposit-addresses` | 充值地址 |
| `/lending` | 借贷 |
| `/bot` | 机器人 |
| `/referral` | 邀请 / 佣金 |

未登录访问任意页面会被重定向到 `/login`。

---

## 认证与权限

- 登录后 Token 存储于 `localStorage` 键 `cx_admin_token`，权限列表存于 `cx_admin_perms`。
- `AuthProvider` 提供 `useAuth()`：`login` / `logout` / `refreshMe` / `hasPerm(perms, ...need)`。
- 登录流程：`api.login` → 保存 token → `api.me()` 拉取当前管理员信息及权限 → 保存 `cx_admin_perms`。
- 后端采用 **RBAC**，角色包括：`super_admin` / `admin` / `operator`。
- 所有 `/api/admin/*` 请求经网关零信任重认证，后端前缀为 `/api/admin`。

---

## 多语言

- 支持 `zh-CN`（默认）、`en-US`、`zh-TW`、`ja-JP`，偏好持久化于 `localStorage` 键 `cx_admin_locale`。
- 使用方式：`t('key')` 或带插值 `t('hello', { name: 'CEO' })`（模板语法 `{name}`），缺失 key 时有兜底文本。

---

## 本地开发

前置要求：已启动后端 `crypto-exchange` 的 `cmd/admin` 服务（监听 `:8095`）。

```bash
npm install
npm run dev
```

- 开发服务器默认端口 **5174**。
- Vite 已配置代理：所有 `/api/admin` 请求转发至 `http://localhost:8095`（对应后端 admin 服务）。

> 后端仓库 `crypto-exchange` 的 admin 服务启动后会监听 `:8095`，接口统一以 `/api/admin` 为前缀。
> 初始化超级管理员账号请参考 `crypto-exchange` 的配置文件（`configs/config.yaml`）。

---

## 构建与预览

```bash
npm run build      # tsc -b && vite build
npm run preview    # 预览构建产物
```

构建输出位于 `dist/`，可直接由静态服务器托管（配合网关反向代理 `/api/admin`）。

---

## 接入后端

| 项目 | 说明 |
|------|------|
| 后端仓库 | `crypto-exchange` |
| Admin 服务 | `cmd/admin`（监听 `:8095`） |
| 接口前缀 | `/api/admin` |
| 协议 | 网关对 `/api/admin/*` 做零信任重认证 |

前端所有请求通过 `src/api/client.ts` 统一封装，新增接口请在 `client.ts` 的 `api` 对象中以
`name: (params?) => request<ResType>(path + buildQuery(params))` 形式追加，保持类型一致。

---

## 相关文档

- 后台接口契约：见 `crypto-exchange/docs/API.md`
- 设计规范：见仓库根目录 `AGENTS.md`（Binance 设计系统指南）
