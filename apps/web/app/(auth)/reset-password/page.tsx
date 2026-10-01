import { Suspense } from "react";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main>
      <Suspense fallback={<p>Loading password reset form...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
