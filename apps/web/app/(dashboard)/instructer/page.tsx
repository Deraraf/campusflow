import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/api/server";

export default async function InstructorDashboardPage() {
  const user = await getCurrentUser();

  if (user?.role !== "INSTRUCTOR") {
    redirect("/student");
  }

  const instructorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Instructor";

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-[#111b2e]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
          Instructor portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Welcome back, {instructorName}.</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          This route is reserved for instructor views and can be expanded with course delivery,
          grading, and faculty operations panels.
        </p>
      </div>
    </main>
  );
}
