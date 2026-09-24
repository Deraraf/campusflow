import { Suspense } from "react";
import VerifyEmailForm from "./verify-email-form";

export default function VerifyEmailPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return (
    <main>
      <Suspense fallback={<p>Preparing email verification...</p>}>
        <VerifyEmailForm apiUrl={apiUrl} />
      </Suspense>
    </main>
  );
}
