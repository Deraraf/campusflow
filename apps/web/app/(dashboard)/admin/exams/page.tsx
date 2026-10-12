import { AdminExams } from "../../../../components/dashboard/admin/admin-assessments";
import {
  isAssessmentOffering,
  isExamRecord,
  resolveAssessmentList,
} from "../../../../lib/admin/assessments";
import { apiFetch } from "../../../../lib/api/server";

export default async function AdminExamsPage() {
  const [examsResult, offeringsResult] = await Promise.allSettled([
    apiFetch<unknown>("/exams"),
    apiFetch<unknown>("/course-offerings"),
  ]);

  return (
    <AdminExams
      exams={resolveAssessmentList(examsResult, isExamRecord, "Exams")}
      offerings={resolveAssessmentList(
        offeringsResult,
        isAssessmentOffering,
        "Course offerings",
      )}
    />
  );
}