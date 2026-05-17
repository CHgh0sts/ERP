import LoginForm from "./form";

export const metadata = { title: "Connexion - ERP" };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <LoginForm />
    </main>
  );
}
