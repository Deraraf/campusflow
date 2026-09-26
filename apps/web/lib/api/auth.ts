export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiError = { message?: string | string[] };

type LoginCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = LoginCredentials & {
  firstName: string;
  lastName: string;
};

async function readError(response: Response, fallback: string): Promise<Error> {
  const data = (await response.json().catch(() => null)) as ApiError | null;
  const message = Array.isArray(data?.message)
    ? data.message.join(", ")
    : data?.message;

  return new Error(message ?? fallback);
}

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw await readError(response, "Unable to sign in");
  }

  return (await response.json()) as AuthUser;
}

export async function register(
  apiUrl: string,
  credentials: RegisterCredentials,
): Promise<AuthUser> {
  const response = await fetch(`${apiUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw await readError(response, "Unable to create your account");
  }

  return (await response.json()) as AuthUser;
}

export async function verifyEmail(
  apiUrl: string,
  token: string,
): Promise<AuthUser> {
  const response = await fetch(`${apiUrl}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw await readError(response, "Unable to verify your email");
  }

  return (await response.json()) as AuthUser;
}

export async function resendVerification(
  apiUrl: string,
  email: string,
): Promise<{ message: string }> {
  const response = await fetch(`${apiUrl}/auth/resend-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  if (!response.ok) {
    throw await readError(response, "Unable to resend the verification email");
  }

  return (await response.json()) as { message: string };
}

export async function logout(apiUrl: string): Promise<void> {
  const response = await fetch(`${apiUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw await readError(response, "Unable to sign out");
  }
}
