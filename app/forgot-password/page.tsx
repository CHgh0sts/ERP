import ForgotForm from "./form";

export const metadata = { title: "Mot de passe oublie - ERP" };

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <ForgotForm />
    </main>
  );
}
