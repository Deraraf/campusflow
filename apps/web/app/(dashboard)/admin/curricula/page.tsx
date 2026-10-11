import AdminCurricula from "../../../../components/dashboard/admin/admin-curricula";
import { apiFetch } from "../../../../lib/api/server";

type ReadResult = PromiseSettledResult<unknown>;

function resultValue(result: ReadResult) {
  return result.status === "fulfilled" ? result.value : null;
}

function resultError(result: ReadResult, label: string) {
  if (result.status === "fulfilled") return null;
  return result.reason instanceof Error
    ? result.reason.message
    : `${label} could not be loaded. Please retry.`;
}

export default async function CurriculaPage() {
  const [colleges, departments, programs, courses] = await Promise.allSettled([
    apiFetch<unknown>("/colleges"),
    apiFetch<unknown>("/departments"),
    apiFetch<unknown>("/programs"),
    apiFetch<unknown>("/courses"),
  ]);

  return (
    <AdminCurricula
      initialData={{
        colleges: resultValue(colleges),
        departments: resultValue(departments),
        programs: resultValue(programs),
        courses: resultValue(courses),
      }}
      initialErrors={{
        colleges: resultError(colleges, "Colleges"),
        departments: resultError(departments, "Departments"),
        programs: resultError(programs, "Programs"),
        courses: resultError(courses, "Courses"),
      }}
    />
  );
}
