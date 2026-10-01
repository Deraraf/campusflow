import { Suspense } from "react";
import VerifyEmailForm from "./verify-email-form";

export default function VerifyEmailPage() {
  return (
    <main>
      <Suspense fallback={<p>Preparing email verification...</p>}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
