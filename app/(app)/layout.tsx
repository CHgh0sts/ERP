import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen" suppressHydrationWarning>
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0" suppressHydrationWarning>
        <Topbar user={user} />
        <main className="flex-1 p-6 bg-background" suppressHydrationWarning>
          {children}
        </main>
      </div>
    </div>
  );
}
