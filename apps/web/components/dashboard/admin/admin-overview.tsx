import { apiFetch } from "../../../lib/api/server";
import AdminSummary, { type AdminMetric } from "./admin-summary";
import AdminWelcomeHeader from "./admin-welcome-header";
import styles from "./admin-overview.module.css";

type CurrentAcademicTerm = Readonly<{
  id: string;
  semester: "FIRST" | "SECOND" | "SUMMER";
}>;

type StudentApplication = Readonly<{
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
}>;

function listMetric(
  label: string,
  emptyDetail: string,
  records: PromiseSettledResult<unknown>,
): AdminMetric {
  if (records.status === "rejected" || !Array.isArray(records.value)) {
    return {
      label,
      value: null,
      detail: `${label} could not be loaded. Refresh to retry.`,
      unavailable: true,
    };
  }

  return {
    label,
    value: records.value.length,
    detail: records.value.length === 0 ? emptyDetail : "All records",
  };
}

function isCurrentAcademicTerm(value: unknown): value is CurrentAcademicTerm {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const term = value as Partial<CurrentAcademicTerm>;
  return (
    typeof term.id === "string" &&
    ["FIRST", "SECOND", "SUMMER"].includes(term.semester ?? "")
  );
}

function isStudentApplication(value: unknown): value is StudentApplication {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const status = (value as { status?: unknown }).status;
  return ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"].includes(
    typeof status === "string" ? status : "",
  );
}

function pendingApplicationsMetric(
  result: PromiseSettledResult<unknown>,
): AdminMetric {
  if (
    result.status === "rejected" ||
    !Array.isArray(result.value) ||
    !result.value.every(isStudentApplication)
  ) {
    return {
      label: "Applications awaiting review",
      value: null,
      detail: "Application data could not be loaded. Refresh to retry.",
      unavailable: true,
    };
  }

  const count = result.value.filter(
    (application) =>
      application.status === "PENDING" || application.status === "UNDER_REVIEW",
  ).length;

  return {
    label: "Applications awaiting review",
    value: count,
    detail: count === 0 ? "No applications awaiting review" : "Pending or under review",
  };
}

export default async function AdminOverview() {
  const [usersResult, studentsResult, instructorsResult, termResult, applicationsResult] =
    await Promise.allSettled([
      apiFetch<unknown>("/users"),
      apiFetch<unknown>("/students"),
      apiFetch<unknown>("/instructors"),
      apiFetch<unknown>("/academic-terms/current"),
      apiFetch<unknown>("/student-applications"),
    ]);

  let offeringsMetric: AdminMetric;
  if (termResult.status === "fulfilled" && isCurrentAcademicTerm(termResult.value)) {
    try {
      const offerings = await apiFetch<unknown>(
        `/academic-terms/${encodeURIComponent(termResult.value.id)}/course-offerings`,
      );
      offeringsMetric = Array.isArray(offerings)
        ? {
            label: "Current-term offerings",
            value: offerings.length,
            detail:
              offerings.length === 0
                ? `No offerings for the ${termResult.value.semester} term`
                : `Current term: ${termResult.value.semester}`,
          }
        : {
            label: "Current-term offerings",
            value: null,
            detail: "Current-term offerings could not be loaded. Refresh to retry.",
            unavailable: true,
          };
    } catch {
      offeringsMetric = {
        label: "Current-term offerings",
        value: null,
        detail: "Current-term offerings could not be loaded. Refresh to retry.",
        unavailable: true,
      };
    }
  } else {
    offeringsMetric = {
      label: "Current-term offerings",
      value: null,
      detail: "Current-term offerings are unavailable. Check the current term and retry.",
      unavailable: true,
    };
  }

  const metrics: readonly AdminMetric[] = [
    listMetric("Total users", "No user accounts yet", usersResult),
    listMetric("Students", "No student records yet", studentsResult),
    listMetric("Instructors", "No instructor records yet", instructorsResult),
    offeringsMetric,
    pendingApplicationsMetric(applicationsResult),
  ];

  return (
    <main className={styles.overview}>
      <AdminWelcomeHeader />
      <AdminSummary metrics={metrics} />
    </main>
  );
}

export function AdminOverviewLoading() {
  return (
    <main className={styles.overview} aria-busy="true">
      <AdminWelcomeHeader />
      <p className={styles.loadingStatus} role="status">
        Loading dashboard data...
      </p>
      <section className={styles.metricsGrid} aria-label="Loading dashboard metrics">
        {[
          "Total users",
          "Students",
          "Instructors",
          "Current-term offerings",
          "Applications awaiting review",
        ].map((label) => (
          <article className={styles.metric} key={label} aria-hidden="true">
            <span className={styles.skeletonLabel}>{label}</span>
            <span className={styles.skeletonValue} />
            <span className={styles.skeletonDetail} />
          </article>
        ))}
      </section>
    </main>
  );
}
