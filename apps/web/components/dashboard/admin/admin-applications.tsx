"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Search, X } from "lucide-react";
import styles from "./admin-applications.module.css";

export type ApplicationStatus =
  "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";

export type AdminApplication = Readonly<{
  id: string;
  userId: string;
  programId: string;
  studentId: string | null;
  status: ApplicationStatus;
  applicationNumber: string;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: Readonly<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  program: Readonly<{
    id: string;
    name: string;
    code: string;
    department: Readonly<{
      id: string;
      name: string;
      code: string;
    }>;
  }>;
  student: Readonly<{ id: string; studentNumber: string }> | null;
}>;

type AcademicYear = Readonly<{
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}>;

type AcademicTerm = Readonly<{
  id: string;
  academicYearId: string;
  semester: "FIRST" | "SECOND" | "SUMMER";
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}>;

type ProgramDetails = Readonly<{ durationYears: number }>;

type ActionMode = "review" | "approve" | "reject";
type ActionTarget = Readonly<{
  application: AdminApplication;
  mode: ActionMode;
}>;
type StatusFilter = "ALL" | ApplicationStatus;

const statuses: readonly ApplicationStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const statusLabels: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAcademicYear(value: unknown): value is AcademicYear {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.isCurrent === "boolean"
  );
}

function isAcademicTerm(value: unknown): value is AcademicTerm {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.academicYearId === "string" &&
    ["FIRST", "SECOND", "SUMMER"].includes(String(value.semester)) &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.isCurrent === "boolean"
  );
}

function isProgramDetails(value: unknown): value is ProgramDetails {
  return (
    isRecord(value) &&
    typeof value.durationYears === "number" &&
    Number.isInteger(value.durationYears) &&
    value.durationYears > 0
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

async function responseError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && "message" in body) {
      if (typeof body.message === "string") return body.message;
      if (Array.isArray(body.message)) {
        return body.message
          .filter((message): message is string => typeof message === "string")
          .join(" ");
      }
    }
  } catch {
    // Use a status-based message for non-JSON error responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

function applicantName(application: AdminApplication) {
  return (
    [application.user.firstName, application.user.lastName]
      .filter(Boolean)
      .join(" ") || application.user.email
  );
}

export default function AdminApplications({
  applications,
  loadError,
}: Readonly<{
  applications: readonly AdminApplication[] | null;
  loadError: string | null;
}>) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [details, setDetails] = useState<AdminApplication | null>(null);
  const [action, setAction] = useState<ActionTarget | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [studentNumber, setStudentNumber] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [admissionYearId, setAdmissionYearId] = useState("");
  const [academicTermId, setAcademicTermId] = useState("");
  const [programYear, setProgramYear] = useState(1);
  const [academicYears, setAcademicYears] = useState<readonly AcademicYear[]>(
    [],
  );
  const [academicTerms, setAcademicTerms] = useState<readonly AcademicTerm[]>(
    [],
  );
  const [yearsLoading, setYearsLoading] = useState(false);
  const [programLoading, setProgramLoading] = useState(false);
  const [programDurationYears, setProgramDurationYears] = useState<
    number | null
  >(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const counts = applications
    ? statuses.reduce(
        (result, status) => {
          result[status] = applications.filter(
            (application) => application.status === status,
          ).length;
          return result;
        },
        {} as Record<ApplicationStatus, number>,
      )
    : null;

  const filteredApplications = (applications ?? []).filter((application) => {
    const haystack =
      `${applicantName(application)} ${application.user.email} ${application.applicationNumber}`.toLowerCase();
    return (
      haystack.includes(search.trim().toLowerCase()) &&
      (statusFilter === "ALL" || application.status === statusFilter)
    );
  });

  async function loadApprovalOptions(programId: string) {
    setYearsLoading(true);
    setProgramLoading(true);
    setOptionsError(null);
    const errors: string[] = [];

    const [yearsResult, programResult] = await Promise.allSettled([
      fetch("/api/admin/admission-years", {
        credentials: "same-origin",
        cache: "no-store",
      }),
      fetch(`/api/admin/programs/${encodeURIComponent(programId)}`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
    ]);

    try {
      if (yearsResult.status === "rejected") throw yearsResult.reason;
      if (!yearsResult.value.ok) {
        throw new Error(await responseError(yearsResult.value));
      }
      const data: unknown = await yearsResult.value.json();
      if (!Array.isArray(data) || !data.every(isAcademicYear)) {
        throw new Error("Academic year data has an unexpected format.");
      }
      setAcademicYears(data);
      if (data.length === 0)
        errors.push("No academic years are available for admission.");
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : "Academic years could not be loaded.",
      );
    } finally {
      setYearsLoading(false);
    }

    try {
      if (programResult.status === "rejected") throw programResult.reason;
      if (!programResult.value.ok) {
        throw new Error(await responseError(programResult.value));
      }
      const program: unknown = await programResult.value.json();
      if (!isProgramDetails(program)) {
        throw new Error("Program duration data has an unexpected format.");
      }
      setProgramDurationYears(program.durationYears);
    } catch (error) {
      setProgramDurationYears(null);
      errors.push(
        error instanceof Error
          ? error.message
          : "Program details could not be loaded.",
      );
    } finally {
      setProgramLoading(false);
    }

    setOptionsError(errors.length ? errors.join(" ") : null);
  }

  async function loadTerms(yearId: string) {
    setAdmissionYearId(yearId);
    setAcademicTermId("");
    setAcademicTerms([]);
    if (!yearId) return;

    setTermsLoading(true);
    setOptionsError(null);
    try {
      const response = await fetch(
        `/api/admin/admission-years/${encodeURIComponent(yearId)}/terms`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isAcademicTerm)) {
        throw new Error("Academic term data has an unexpected format.");
      }
      setAcademicTerms(data);
      if (data.length === 0) {
        setOptionsError("No academic terms exist for the selected year.");
      }
    } catch (error) {
      setOptionsError(
        error instanceof Error
          ? error.message
          : "Academic terms could not be loaded.",
      );
    } finally {
      setTermsLoading(false);
    }
  }

  function openAction(application: AdminApplication, mode: ActionMode) {
    setNotice(null);
    setActionError(null);
    setStudentNumber("");
    setRejectionReason("");
    setAdmissionYearId("");
    setAcademicTermId("");
    setProgramYear(1);
    setProgramDurationYears(null);
    setAcademicYears([]);
    setAcademicTerms([]);
    setOptionsError(null);
    setAction({ application, mode });
    if (mode === "approve") void loadApprovalOptions(application.programId);
  }

  async function submitAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || pending) return;

    const cleanStudentNumber = studentNumber.trim();
    if (action.mode === "approve") {
      if (!cleanStudentNumber || !admissionYearId || !academicTermId) {
        setActionError(
          "Complete the student number, admission year, and initial term.",
        );
        return;
      }
      if (!Number.isInteger(programYear) || programYear < 1) {
        setActionError("Program year must be a positive whole number.");
        return;
      }
      if (programDurationYears === null || programYear > programDurationYears) {
        setActionError(
          `Program year must be between 1 and ${programDurationYears ?? "the program duration"}.`,
        );
        return;
      }
    }

    if (action.mode === "reject" && !rejectionReason.trim()) {
      setActionError("Enter a reason for rejecting this application.");
      return;
    }

    setPending(true);
    setActionError(null);
    try {
      const body =
        action.mode === "approve"
          ? {
              studentNumber: cleanStudentNumber,
              admissionAcademicYearId: admissionYearId,
              academicTermId,
              programYear,
            }
          : action.mode === "reject"
            ? { rejectionReason: rejectionReason.trim() }
            : undefined;
      const response = await fetch(
        `/api/admin/student-applications/${encodeURIComponent(action.application.id)}/${action.mode}`,
        {
          method: "POST",
          credentials: "same-origin",
          ...(body
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }
            : {}),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));

      const completedAction = action.mode;
      const applicationNumber = action.application.applicationNumber;
      setAction(null);
      setNotice(
        completedAction === "review"
          ? `${applicationNumber} moved into review.`
          : completedAction === "approve"
            ? `${applicationNumber} approved and student record created.`
            : `${applicationNumber} rejected.`,
      );
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The application could not be updated. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Student applications</h1>
          <p className={styles.description}>
            Review admission applications and manage supported decisions.
          </p>
        </div>
        {applications ? (
          <p className={styles.totalCount}>
            {applications.length.toLocaleString()} applications
          </p>
        ) : null}
      </header>

      {notice ? (
        <p className={styles.successNotice} role="status">
          {notice}
        </p>
      ) : null}

      {counts ? (
        <section
          className={styles.summary}
          aria-label="Application status totals"
        >
          {statuses.map((status) => (
            <article className={styles.summaryItem} key={status}>
              <span>{statusLabels[status]}</span>
              <strong>{counts[status].toLocaleString()}</strong>
            </article>
          ))}
        </section>
      ) : null}

      {loadError ? (
        <section className={styles.errorPanel} role="alert">
          <h2>Applications could not be loaded</h2>
          <p>{loadError}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => router.refresh()}
          >
            Retry
          </button>
        </section>
      ) : applications === null ? (
        <section className={styles.emptyPanel}>
          <ClipboardList size={22} aria-hidden="true" />
          <h2>Application list unavailable</h2>
          <p>No application data was returned. Refresh to try again.</p>
        </section>
      ) : (
        <>
          <section className={styles.toolbar} aria-label="Filter applications">
            <label className={styles.searchField}>
              <Search size={17} aria-hidden="true" />
              <span className={styles.visuallyHidden}>
                Search applications by applicant name, email, or application
                number
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or application number"
              />
            </label>
            <label className={styles.filterField}>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
              >
                <option value="ALL">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <p className={styles.resultCount} aria-live="polite">
            Showing {filteredApplications.length.toLocaleString()} of{" "}
            {applications.length.toLocaleString()} applications
          </p>

          {applications.length === 0 ? (
            <section className={styles.emptyPanel}>
              <ClipboardList size={22} aria-hidden="true" />
              <h2>No applications yet</h2>
              <p>Submitted applications will appear here.</p>
            </section>
          ) : filteredApplications.length === 0 ? (
            <section className={styles.emptyPanel}>
              <Search size={22} aria-hidden="true" />
              <h2>No matching applications</h2>
              <p>Try changing your search or status filter.</p>
            </section>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.applicationTable}>
                  <caption className={styles.visuallyHidden}>
                    Student admission applications
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Applicant</th>
                      <th scope="col">Program</th>
                      <th scope="col">Application</th>
                      <th scope="col">Status</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">
                        <span className={styles.visuallyHidden}>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <div className={styles.primaryText}>
                            <strong>{applicantName(application)}</strong>
                            <span>{application.user.email}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.primaryText}>
                            <strong>{application.program.name}</strong>
                            <span>
                              {application.program.code} ·{" "}
                              {application.program.department.name}
                            </span>
                          </div>
                        </td>
                        <td>{application.applicationNumber}</td>
                        <td>
                          <StatusBadge status={application.status} />
                        </td>
                        <td>{formatDate(application.submittedAt)}</td>
                        <td>
                          <ApplicationActions
                            application={application}
                            onDetails={() => setDetails(application)}
                            onAction={(mode) => openAction(application, mode)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul
                className={styles.mobileList}
                aria-label="Student applications"
              >
                {filteredApplications.map((application) => (
                  <li className={styles.mobileCard} key={application.id}>
                    <div className={styles.mobileTop}>
                      <div className={styles.primaryText}>
                        <strong>{applicantName(application)}</strong>
                        <span>{application.user.email}</span>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                    <dl className={styles.mobileFacts}>
                      <div>
                        <dt>Program</dt>
                        <dd>
                          {application.program.name} ({application.program.code}
                          )
                        </dd>
                      </div>
                      <div>
                        <dt>Application</dt>
                        <dd>{application.applicationNumber}</dd>
                      </div>
                      <div>
                        <dt>Submitted</dt>
                        <dd>{formatDate(application.submittedAt)}</dd>
                      </div>
                    </dl>
                    <ApplicationActions
                      application={application}
                      onDetails={() => setDetails(application)}
                      onAction={(mode) => openAction(application, mode)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {details ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetails(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-details-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setDetails(null);
            }}
          >
            <DialogHeader
              eyebrow="APPLICATION DETAILS"
              title={details.applicationNumber}
              titleId="application-details-title"
              autoFocus
              onClose={() => setDetails(null)}
            />
            <dl className={styles.detailList}>
              <Detail label="Applicant" value={applicantName(details)} />
              <Detail label="Email" value={details.user.email} />
              <Detail label="Status" value={statusLabels[details.status]} />
              <Detail
                label="Program"
                value={`${details.program.name} (${details.program.code})`}
              />
              <Detail
                label="Department"
                value={`${details.program.department.name} (${details.program.department.code})`}
              />
              <Detail
                label="Submitted"
                value={formatDate(details.submittedAt)}
              />
              <Detail label="Reviewed" value={formatDate(details.reviewedAt)} />
              {details.student ? (
                <Detail
                  label="Student number"
                  value={details.student.studentNumber}
                />
              ) : null}
              {details.rejectionReason ? (
                <Detail
                  label="Rejection reason"
                  value={details.rejectionReason}
                />
              ) : null}
            </dl>
          </section>
        </div>
      ) : null}

      {action ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending)
              setAction(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-action-title"
            aria-describedby="application-action-description"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !pending) setAction(null);
            }}
          >
            <DialogHeader
              eyebrow="ADMISSION WORKFLOW"
              title={
                action.mode === "review"
                  ? "Move into review?"
                  : action.mode === "approve"
                    ? "Approve application"
                    : "Reject application"
              }
              autoFocus={action.mode === "review"}
              onClose={() => {
                if (!pending) setAction(null);
              }}
              closeDisabled={pending}
            />
            <p
              className={styles.dialogCopy}
              id="application-action-description"
            >
              {action.mode === "review"
                ? `Move ${action.application.applicationNumber} into review for ${applicantName(action.application)}?`
                : action.mode === "approve"
                  ? `Approval creates the student's Student profile and initial academic standing through the backend admission workflow.`
                  : `Reject ${action.application.applicationNumber} for ${applicantName(action.application)}. This decision will be recorded with your reason.`}
            </p>

            <form className={styles.actionForm} onSubmit={submitAction}>
              {action.mode === "approve" ? (
                <>
                  <label className={styles.formField}>
                    <span>Student number</span>
                    <input
                      autoFocus
                      required
                      autoComplete="off"
                      value={studentNumber}
                      onChange={(event) => setStudentNumber(event.target.value)}
                    />
                  </label>
                  <label className={styles.formField}>
                    <span>Admission academic year</span>
                    <select
                      required
                      value={admissionYearId}
                      disabled={
                        yearsLoading ||
                        programLoading ||
                        programDurationYears === null ||
                        academicYears.length === 0
                      }
                      onChange={(event) => void loadTerms(event.target.value)}
                    >
                      <option value="">Select an academic year</option>
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                          {year.isCurrent ? " (Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>Initial academic term</span>
                    <select
                      required
                      value={academicTermId}
                      disabled={
                        !admissionYearId ||
                        termsLoading ||
                        academicTerms.length === 0
                      }
                      onChange={(event) =>
                        setAcademicTermId(event.target.value)
                      }
                    >
                      <option value="">Select a term</option>
                      {academicTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.semester}
                          {term.isCurrent ? " (Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>Program year</span>
                    <input
                      required
                      type="number"
                      min={1}
                      max={programDurationYears ?? undefined}
                      step={1}
                      value={programYear}
                      onChange={(event) =>
                        setProgramYear(Number(event.target.value))
                      }
                    />
                  </label>
                  {programDurationYears ? (
                    <p className={styles.formHint}>
                      Program duration: {programDurationYears}{" "}
                      {programDurationYears === 1 ? "year" : "years"}
                    </p>
                  ) : null}
                  {yearsLoading || programLoading || termsLoading ? (
                    <p className={styles.formHint} role="status">
                      Loading academic options...
                    </p>
                  ) : null}
                  {optionsError ? (
                    <div className={styles.formError} role="alert">
                      <p>{optionsError}</p>
                      <button
                        className={styles.textButton}
                        type="button"
                        onClick={() =>
                          action
                            ? void loadApprovalOptions(
                                action.application.programId,
                              )
                            : undefined
                        }
                      >
                        Retry options
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}

              {action.mode === "reject" ? (
                <label className={styles.formField}>
                  <span>Rejection reason</span>
                  <textarea
                    autoFocus
                    required
                    rows={4}
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                  />
                </label>
              ) : null}

              {actionError ? (
                <p className={styles.formError} role="alert">
                  {actionError}
                </p>
              ) : null}
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={pending}
                  onClick={() => setAction(null)}
                >
                  Cancel
                </button>
                <button
                  className={
                    action.mode === "reject"
                      ? styles.dangerButton
                      : styles.primaryButton
                  }
                  type="submit"
                  disabled={
                    pending ||
                    (action.mode === "approve" &&
                      (yearsLoading ||
                        programLoading ||
                        termsLoading ||
                        programDurationYears === null ||
                        Boolean(optionsError) ||
                        academicYears.length === 0 ||
                        academicTerms.length === 0))
                  }
                >
                  {pending
                    ? "Submitting..."
                    : action.mode === "review"
                      ? "Confirm review"
                      : action.mode === "approve"
                        ? "Confirm approval"
                        : "Confirm rejection"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function StatusBadge({ status }: Readonly<{ status: ApplicationStatus }>) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${status}`]}`}>
      {statusLabels[status]}
    </span>
  );
}

function ApplicationActions({
  application,
  onDetails,
  onAction,
}: Readonly<{
  application: AdminApplication;
  onDetails: () => void;
  onAction: (mode: ActionMode) => void;
}>) {
  return (
    <div className={styles.rowActions}>
      <button className={styles.textButton} type="button" onClick={onDetails}>
        Details
      </button>
      {application.status === "PENDING" ? (
        <>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => onAction("review")}
          >
            Review
          </button>
          <button
            className={styles.dangerTextButton}
            type="button"
            onClick={() => onAction("reject")}
          >
            Reject
          </button>
        </>
      ) : null}
      {application.status === "UNDER_REVIEW" ? (
        <>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => onAction("approve")}
          >
            Approve
          </button>
          <button
            className={styles.dangerTextButton}
            type="button"
            onClick={() => onAction("reject")}
          >
            Reject
          </button>
        </>
      ) : null}
    </div>
  );
}

function DialogHeader({
  eyebrow,
  title,
  titleId = "application-action-title",
  autoFocus = false,
  onClose,
  closeDisabled = false,
}: Readonly<{
  eyebrow: string;
  title: string;
  titleId?: string;
  autoFocus?: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
}>) {
  return (
    <header className={styles.dialogHeader}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
      </div>
      <button
        className={styles.iconButton}
        type="button"
        autoFocus={autoFocus}
        aria-label="Close dialog"
        disabled={closeDisabled}
        onClick={onClose}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </header>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
