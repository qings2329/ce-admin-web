import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { NavBar } from "./components/NavBar";
import { Login } from "./pages/Login";
import { Risk } from "./pages/Risk";
import { Users } from "./pages/Users";
import { Symbols } from "./pages/Symbols";
import { Ops } from "./pages/Ops";
import { Deposits } from "./pages/Deposits";
import { Chains } from "./pages/Chains";
import { Coins } from "./pages/Coins";
import { Admins } from "./pages/Admins";
import { Roles } from "./pages/Roles";
import { Settings } from "./pages/Settings";
import { Announcements } from "./pages/Announcements";
import { Notifications } from "./pages/Notifications";
import { Orders } from "./pages/Orders";
import { Dashboard } from "./pages/Dashboard";
import { Audit } from "./pages/Audit";
import { ApiKeys } from "./pages/ApiKeys";
import { UserDepositAddresses } from "./pages/UserDepositAddresses";
import { LendingAdmin } from "./pages/LendingAdmin";
import { BotAdmin } from "./pages/BotAdmin";
import { ReferralAdmin } from "./pages/ReferralAdmin";

function useHash() {
  const [hash, setHash] = useState(location.hash || "#/dashboard");
  useEffect(() => {
    const on = () => setHash(location.hash || "#/dashboard");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

const PAGES: Record<string, () => JSX.Element> = {
  "/dashboard": Dashboard,
  "/risk": Risk,
  "/users": Users,
  "/symbols": Symbols,
  "/ops": Ops,
  "/deposits": Deposits,
  "/chains": Chains,
  "/coins": Coins,
  "/admins": Admins,
  "/roles": Roles,
  "/settings": Settings,
  "/announcements": Announcements,
  "/notifications": Notifications,
  "/orders": Orders,
  "/audit": Audit,
  "/apikeys": ApiKeys,
  "/deposit-addresses": UserDepositAddresses,
  "/lending": LendingAdmin,
  "/bot": BotAdmin,
  "/referral": ReferralAdmin,
};

function Router() {
  const hash = useHash();
  const path = hash.replace(/^#/, "").split("?")[0];
  const { authed } = useAuth();

  if (path === "/login") return <Login />;
  if (!authed) {
    location.hash = "/login";
    return <Login />;
  }

  const Page = PAGES[path] ?? Dashboard;
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-[1200px] p-3">
        <Page />
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
