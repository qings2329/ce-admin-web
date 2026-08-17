import { useAuth, hasPerm } from "../lib/auth";

// 全部导航项；带 perm 的项仅当当前管理员拥有该权限时显示。
const ALL_LINKS: { path: string; label: string; perm?: string }[] = [
  { path: "/risk", label: "风控与强平监控" },
  { path: "/users", label: "用户与账户" },
  { path: "/symbols", label: "交易对配置" },
  { path: "/ops", label: "运营看板" },
  { path: "/deposits", label: "充值提币" },
  { path: "/chains", label: "公链管理" },
  { path: "/coins", label: "币种管理" },
  { path: "/admins", label: "管理员管理", perm: "admin:manage" },
  { path: "/roles", label: "权限与角色", perm: "role:manage" },
  { path: "/settings", label: "安全设置" },
];

export function NavBar() {
  const { logout, perms } = useAuth();
  const links = ALL_LINKS.filter((l) => !l.perm || hasPerm(perms, l.perm));
  const current = location.hash.replace(/^#/, "").split("?")[0];
  return (
    <nav className="navbar">
      <span className="brand">管理后台</span>
      <div className="nav-links">
        {links.map((l) => (
          <a
            key={l.path}
            href={`#${l.path}`}
            className={current === l.path ? "nav-link active" : "nav-link"}
          >
            {l.label}
          </a>
        ))}
      </div>
      <button className="btn-logout" onClick={logout}>
        退出登录
      </button>
    </nav>
  );
}
