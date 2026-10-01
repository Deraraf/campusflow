import { Suspense } from "react";
import ForgotPasswordForm from "./forgot-password-form";


export default function ForgotPasswordPage() {
  return (
    <main>
      <Suspense fallback={<p>Loading password reset form...</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
