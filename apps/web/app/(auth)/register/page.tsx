import RegisterForm from "./register-form";

export default function RegisterPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return (
    <main>
      <RegisterForm apiUrl={apiUrl} />
    </main>
  );
}
