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

function useHash() {
  const [hash, setHash] = useState(location.hash || "#/risk");
  useEffect(() => {
    const on = () => setHash(location.hash || "#/risk");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

const PAGES: Record<string, () => JSX.Element> = {
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

  const Page = PAGES[path] ?? Risk;
  return (
    <>
      <NavBar />
      <main className="content">
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
