import { Suspense } from "react";
import ResendVerificationForm from "./resend-verification-form";

const ResendVerification = () => {
  return (
    <main>
      <Suspense fallback={<p>Loading resend form...</p>}>
        <ResendVerificationForm />
      </Suspense>
    </main>
  );
};

export default ResendVerification;