import SetupWizard from "./wizard";

export const metadata = { title: "Configuration initiale - ERP" };

export default function SetupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <SetupWizard />
    </main>
  );
}
