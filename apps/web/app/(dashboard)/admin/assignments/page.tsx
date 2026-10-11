import { AdminAssignments } from "../../../../components/dashboard/admin/admin-assessments";
import {
  isAssessmentOffering,
  isAssignmentRecord,
  resolveAssessmentList,
} from "../../../../lib/admin/assessments";
import { apiFetch } from "../../../../lib/api/server";

export default async function AdminAssignmentsPage() {
  const [assignmentsResult, offeringsResult] = await Promise.allSettled([
    apiFetch<unknown>("/assignments"),
    apiFetch<unknown>("/course-offerings"),
  ]);

  return (
    <AdminAssignments
      assignments={resolveAssessmentList(
        assignmentsResult,
        isAssignmentRecord,
        "Assignments",
      )}
      offerings={resolveAssessmentList(
        offeringsResult,
        isAssessmentOffering,
        "Course offerings",
      )}
    />
  );
}