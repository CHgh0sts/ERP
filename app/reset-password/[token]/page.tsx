import ResetForm from "./form";

export const metadata = { title: "Reinitialiser le mot de passe - ERP" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <ResetForm token={token} />
    </main>
  );
}
