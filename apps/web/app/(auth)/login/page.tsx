import LoginForm from "./login-form";

export default function LoginPage() {
  const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

  return (
    <main>
      <LoginForm apiUrl={apiUrl} />
    </main>
  );
}
