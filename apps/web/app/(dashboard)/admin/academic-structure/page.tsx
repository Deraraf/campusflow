import AdminAcademicStructure from "../../../../components/dashboard/admin/admin-academic-structure";
import { apiFetch } from "../../../../lib/api/server";

type StructureResource =
  "colleges" | "departments" | "programs" | "instructors";

type ListResult = PromiseSettledResult<unknown>;

function resultValue(result: ListResult) {
  return result.status === "fulfilled" ? result.value : null;
}

function resultError(result: ListResult, label: string) {
  if (result.status === "fulfilled") return null;
  return result.reason instanceof Error
    ? result.reason.message
    : `${label} could not be loaded. Please try again.`;
}

export default async function AcademicStructurePage() {
  const [colleges, departments, programs, instructors] =
    await Promise.allSettled([
      apiFetch<unknown>("/colleges"),
      apiFetch<unknown>("/departments"),
      apiFetch<unknown>("/programs"),
      apiFetch<unknown>("/instructors"),
    ]);

  const results: Record<StructureResource, ListResult> = {
    colleges,
    departments,
    programs,
    instructors,
  };

  return (
    <AdminAcademicStructure
      initialData={{
        colleges: resultValue(colleges),
        departments: resultValue(departments),
        programs: resultValue(programs),
        instructors: resultValue(instructors),
      }}
      initialErrors={{
        colleges: resultError(results.colleges, "Colleges"),
        departments: resultError(results.departments, "Departments"),
        programs: resultError(results.programs, "Programs"),
        instructors: resultError(results.instructors, "Instructor options"),
      }}
    />
  );
}
