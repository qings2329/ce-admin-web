import { useAuth } from "../../lib/auth";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }) {
  const { authed } = useAuth();
  if (!authed) return null;
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[hsl(var(--background))]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
