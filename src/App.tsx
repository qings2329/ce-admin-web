import { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/layout/Layout";
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
import { WealthAdmin } from "./pages/WealthAdmin";
import { ReferralAdmin } from "./pages/ReferralAdmin";
import { RiskDashboard } from "./pages/RiskDashboard";
import { C2C } from "./pages/C2C";
import { KycReview } from "./pages/KycReview";
import { LargeWithdrawalReview } from "./pages/LargeWithdrawalReview";

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
  "/risk-dashboard": RiskDashboard,
  "/kyc-review": KycReview,
  "/large-withdrawal-review": LargeWithdrawalReview,
  "/users": Users,
  "/symbols": Symbols,
  "/ops": Ops,
  "/deposits": Deposits,
  "/deposit-addresses": UserDepositAddresses,
  "/chains": Chains,
  "/coins": Coins,
  "/admins": Admins,
  "/roles": Roles,
  "/announcements": Announcements,
  "/notifications": Notifications,
  "/orders": Orders,
  "/audit": Audit,
  "/apikeys": ApiKeys,
  "/lending": LendingAdmin,
  "/bot": BotAdmin,
  "/wealth": WealthAdmin,
  "/referral": ReferralAdmin,
  "/c2c": C2C,
  "/settings": Settings,
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
    <Layout>
      <ErrorBoundary>
        <Page />
      </ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
