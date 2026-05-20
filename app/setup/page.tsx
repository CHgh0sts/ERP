import { redirect } from "next/navigation";
import { isAppInitialized } from "@/lib/setup";
import SetupWizard from "./wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuration initiale - ERP" };

export default async function SetupPage() {
  if (await isAppInitialized()) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <SetupWizard />
    </main>
  );
}
