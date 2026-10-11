"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import type { StudentSummary } from "../../../lib/admin/student-records";
import type {
  AcademicTermOption,
  AcademicYearOption,
  EnrollmentRecord,
  EnrollmentStatus,
  ListResult,
  OfferingOption,
} from "../../../lib/admin/enrollments";
import {
  isAcademicTermOption,
  isEnrollmentRecord,
  isOfferingOption,
} from "../../../lib/admin/enrollments";
import styles from "./admin-enrollments.module.css";

const statusLabels: Record<EnrollmentStatus, string> = {
  ACTIVE: "Active",
  DROPPED: "Dropped",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

const allowedTransitions: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
  ACTIVE: ["DROPPED", "COMPLETED", "FAILED"],
  DROPPED: ["ACTIVE"],
  COMPLETED: [],
  FAILED: [],
};

type AsyncOptions<T> = Readonly<{
  data: readonly T[] | null;
  error: string | null;
  loading: boolean;
}>;

function fullName(person: Readonly<{ firstName: string | null; lastName: string | null }> | null) {
  if (!person) return "Student details unavailable";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || "Name unavailable";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function semesterLabel(value: string | null | undefined) {
  if (!value) return "Term unavailable";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function errorFromResponse(response: Response) {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "message" in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === "string") return message;
      if (Array.isArray(message)) {
        return message.filter((item) => typeof item === "string").join(" ");
      }
    }
  } catch {
    // Use a status-based message for non-JSON responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

async function fetchOptions<T>(
  path: string,
  guard: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<readonly T[]> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(await errorFromResponse(response));

  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(guard)) {
    throw new Error("The service returned data in an unexpected format.");
  }
  return data;
}

function RetryButton({ onRetry, disabled = false }: Readonly<{
  onRetry: () => void;
  disabled?: boolean;
}>) {
  return (
    <button
      className={styles.secondaryButton}
      type="button"
      onClick={onRetry}
      disabled={disabled}
    >
      <RefreshCw size={15} aria-hidden="true" />
      Retry
    </button>
  );
}

function ErrorPanel({
  title,
  message,
  onRetry,
}: Readonly<{ title: string; message: string; onRetry: () => void }>) {
  return (
    <section className={styles.errorPanel} role="alert">
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      <RetryButton onRetry={onRetry} />
    </section>
  );
}

function enrollmentLabel(enrollment: EnrollmentRecord) {
  return [
    enrollment.course?.code,
    enrollment.course?.title,
    enrollment.student?.studentNumber,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function AdminEnrollments({
  enrollments,
  students,
  academicYears,
}: Readonly<{
  enrollments: ListResult<EnrollmentRecord>;
  students: ListResult<StudentSummary>;
  academicYears: ListResult<AcademicYearOption>;
}>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | "ALL">("ALL");
  const [statusRetry, setStatusRetry] = useState(0);
  const [statusResult, setStatusResult] = useState<Readonly<{
    status: EnrollmentStatus;
    data: readonly EnrollmentRecord[] | null;
    error: string | null;
  }> | null>(null);
  const [yearFilter, setYearFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const studentById = new Map(
    (students.data ?? []).map((student) => [student.id, student]),
  );

  useEffect(() => {
    if (statusFilter === "ALL") return;

    const controller = new AbortController();
    void fetchOptions(
      `/api/admin/enrollments?status=${encodeURIComponent(statusFilter)}`,
      (value): value is EnrollmentRecord =>
        isEnrollmentRecord(value) && value.status === statusFilter,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setStatusResult({ status: statusFilter, data, error: null });
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setStatusResult({
            status: statusFilter,
            data: null,
            error: caught instanceof Error
              ? caught.message
              : "Filtered enrollment records could not be loaded.",
          });
        }
      });
    return () => controller.abort();
  }, [statusFilter, statusRetry]);

  const statusRequestPending =
    statusFilter !== "ALL" && statusResult?.status !== statusFilter;
  const statusRequestError =
    statusFilter !== "ALL" && statusResult?.status === statusFilter
      ? statusResult.error
      : null;
  const records =
    statusFilter === "ALL"
      ? enrollments.data ?? []
      : statusResult?.status === statusFilter
        ? statusResult.data ?? []
        : [];
  const directoryError = statusFilter === "ALL" ? enrollments.error : statusRequestError;

  const yearsInRecords = Array.from(
    new Map(
      records
        .filter((enrollment) => enrollment.academicTerm?.academicYear)
        .map((enrollment) => [
          enrollment.academicTerm!.academicYear!.id,
          enrollment.academicTerm!.academicYear!,
        ]),
    ).values(),
  );
  const yearOptions = academicYears.data?.length
    ? academicYears.data
    : yearsInRecords;
  const termOptions = Array.from(
    new Map(
      records
        .filter((enrollment) => enrollment.academicTerm)
        .map((enrollment) => [
          enrollment.academicTerm!.id,
          {
            id: enrollment.academicTerm!.id,
            semester: enrollment.academicTerm!.semester,
            academicYearId: enrollment.academicTerm!.academicYear?.id ?? "",
            academicYearName:
              enrollment.academicTerm!.academicYear?.name ??
              "Academic year unavailable",
          },
        ]),
    ).values(),
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleEnrollments = records.filter((enrollment) => {
    const studentEmail = enrollment.student
      ? studentById.get(enrollment.student.id)?.user?.email
      : undefined;
    const searchableText = [
      fullName(enrollment.student),
      enrollment.student?.studentNumber,
      studentEmail,
      enrollment.course?.code,
      enrollment.course?.title,
      enrollment.offering?.section,
      enrollment.instructor?.firstName,
      enrollment.instructor?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      searchableText.includes(normalizedQuery) &&
      (statusFilter === "ALL" || enrollment.status === statusFilter) &&
      (yearFilter === "ALL" ||
        enrollment.academicTerm?.academicYear?.id === yearFilter) &&
      (termFilter === "ALL" || enrollment.academicTerm?.id === termFilter)
    );
  });

  const selectedEnrollment = records.find(
    (enrollment) => enrollment.id === selectedEnrollmentId,
  );

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setYearFilter("ALL");
    setTermFilter("ALL");
  }

  function selectEnrollment(enrollment: EnrollmentRecord) {
    setSelectedEnrollmentId((current) =>
      current === enrollment.id ? null : enrollment.id,
    );
    setNotice(null);
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Enrollments</h1>
          <p className={styles.description}>
            Review student registrations and their course offerings.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => {
            setShowCreateForm((current) => !current);
            setNotice(null);
          }}
        >
          {showCreateForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {showCreateForm ? "Close form" : "New enrollment"}
        </button>
      </header>

      {notice ? (
        <p className={styles.successNotice} role="status">
          {notice}
        </p>
      ) : null}

      {showCreateForm ? (
        <CreateEnrollmentForm
          students={students}
          academicYears={academicYears}
          onCancel={() => setShowCreateForm(false)}
          onCreated={(message) => {
            setNotice(message);
            setShowCreateForm(false);
            setStatusFilter("ALL");
            setStatusResult(null);
            router.refresh();
          }}
          onRetry={() => router.refresh()}
        />
      ) : null}

      {students.error ? (
        <div className={styles.dataNotice} role="status">
          Student details could not be loaded. Enrollment search will omit email, and new enrollments are unavailable.
          <RetryButton onRetry={() => router.refresh()} />
        </div>
      ) : null}

      {directoryError ? (
        <ErrorPanel
          title="Enrollment records could not be loaded"
          message={directoryError}
          onRetry={() => {
            if (statusFilter === "ALL") router.refresh();
            else {
              setStatusResult(null);
              setStatusRetry((value) => value + 1);
            }
          }}
        />
      ) : statusFilter === "ALL" && enrollments.data === null ? (
        <section className={styles.emptyPanel}>
          <BookOpen size={22} aria-hidden="true" />
          <h2>Enrollment list unavailable</h2>
          <p>No enrollment data was returned. Refresh to try again.</p>
          <RetryButton onRetry={() => router.refresh()} />
        </section>
      ) : statusRequestPending ? (
        <section className={styles.loadingPanel} aria-label="Loading filtered enrollments" aria-busy="true">
          <span />
          <span />
          <span />
        </section>
      ) : statusFilter === "ALL" && records.length === 0 ? (
        <section className={styles.emptyPanel}>
          <BookOpen size={22} aria-hidden="true" />
          <h2>No enrollment records</h2>
          <p>The enrollment service returned no records.</p>
        </section>
      ) : (
        <>
          <section className={styles.toolbar} aria-label="Filter enrollment records">
            <label className={styles.searchField}>
              <Search size={17} aria-hidden="true" />
              <span className={styles.visuallyHidden}>Search enrollments</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Student, email, course, or section"
              />
            </label>
            <label className={styles.filterField}>
              <span>Academic year</span>
              <select
                value={yearFilter}
                onChange={(event) => {
                  setYearFilter(event.target.value);
                  setTermFilter("ALL");
                }}
              >
                <option value="ALL">All years</option>
                {yearOptions.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Academic term</span>
              <select
                value={termFilter}
                onChange={(event) => setTermFilter(event.target.value)}
              >
                <option value="ALL">All terms</option>
                {termOptions
                  .filter((term) => yearFilter === "ALL" || term.academicYearId === yearFilter)
                  .map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.academicYearName} · {semesterLabel(term.semester)}
                    </option>
                  ))}
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Enrollment status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusResult(null);
                  setStatusFilter(event.target.value as EnrollmentStatus | "ALL");
                }}
              >
                <option value="ALL">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </section>

          <p className={styles.resultCount} aria-live="polite">
            {statusFilter === "ALL"
              ? `Showing ${visibleEnrollments.length.toLocaleString()} of ${records.length.toLocaleString()} returned enrollments`
              : `Showing ${visibleEnrollments.length.toLocaleString()} matching ${statusLabels[statusFilter].toLowerCase()} enrollments`}
          </p>

          {visibleEnrollments.length === 0 ? (
            <section className={styles.emptyPanel}>
              <Search size={22} aria-hidden="true" />
              <h2>No matching enrollments</h2>
              <p>Change or clear the search and filters to see enrollment records.</p>
              <button className={styles.secondaryButton} type="button" onClick={clearFilters}>
                Clear filters
              </button>
            </section>
          ) : (
            <>
              <div className={styles.desktopTable}>
                <table className={styles.enrollmentTable}>
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Course / offering</th>
                      <th scope="col">Academic term</th>
                      <th scope="col">Status</th>
                      <th scope="col">Enrolled</th>
                      <th scope="col"><span className={styles.visuallyHidden}>Details</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEnrollments.map((enrollment) => (
                      <EnrollmentRow
                        key={enrollment.id}
                        enrollment={enrollment}
                        email={enrollment.student ? studentById.get(enrollment.student.id)?.user?.email : undefined}
                        expanded={selectedEnrollmentId === enrollment.id}
                        onSelect={() => selectEnrollment(enrollment)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className={styles.mobileEnrollments}>
                {visibleEnrollments.map((enrollment) => (
                  <li className={styles.mobileEnrollment} key={enrollment.id}>
                    <div className={styles.mobileHeading}>
                      <div className={styles.identity}>
                        <strong>{fullName(enrollment.student)}</strong>
                        <span>{enrollment.student?.studentNumber ?? "Student number unavailable"}</span>
                        {enrollment.student && studentById.get(enrollment.student.id)?.user?.email ? (
                          <span>{studentById.get(enrollment.student.id)?.user?.email}</span>
                        ) : null}
                      </div>
                      <StatusBadge status={enrollment.status} />
                    </div>
                    <div className={styles.courseSummary}>
                      <strong>{enrollment.course?.code ?? "Course unavailable"}</strong>
                      <span>{enrollment.course?.title ?? "Course details unavailable"} · Section {enrollment.offering?.section ?? "Unavailable"}</span>
                    </div>
                    <div className={styles.mobileTerm}>
                      {enrollment.academicTerm?.academicYear?.name ?? "Academic year unavailable"} · {semesterLabel(enrollment.academicTerm?.semester)}
                    </div>
                    <div className={styles.mobileActions}>
                      <time dateTime={enrollment.enrolledAt}>{formatDate(enrollment.enrolledAt)}</time>
                      <button
                        className={styles.textButton}
                        type="button"
                        aria-expanded={selectedEnrollmentId === enrollment.id}
                        aria-controls="selected-enrollment-details"
                        onClick={() => selectEnrollment(enrollment)}
                      >
                        Details <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {selectedEnrollment ? (
            <EnrollmentDetails
              enrollment={selectedEnrollment}
              student={selectedEnrollment.student ? studentById.get(selectedEnrollment.student.id) ?? null : null}
              onClose={() => setSelectedEnrollmentId(null)}
              onStatusUpdated={(message) => {
                setNotice(message);
                setStatusFilter("ALL");
                setStatusResult(null);
                router.refresh();
              }}
            />
          ) : null}
        </>
      )}
    </main>
  );
}

function StatusBadge({ status }: Readonly<{ status: EnrollmentStatus }>) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${status}`]}`}>
      {statusLabels[status]}
    </span>
  );
}

function EnrollmentRow({
  enrollment,
  email,
  expanded,
  onSelect,
}: Readonly<{
  enrollment: EnrollmentRecord;
  email: string | undefined;
  expanded: boolean;
  onSelect: () => void;
}>) {
  return (
    <tr>
      <td>
        <div className={styles.identity}>
          <strong>{fullName(enrollment.student)}</strong>
          <span>{enrollment.student?.studentNumber ?? "Student number unavailable"}</span>
          <span>{email ?? "Email unavailable"}</span>
        </div>
      </td>
      <td>
        <div className={styles.courseSummary}>
          <strong>{enrollment.course?.code ?? "Course unavailable"}</strong>
          <span>{enrollment.course?.title ?? "Course details unavailable"}</span>
          <span>Section {enrollment.offering?.section ?? "Unavailable"}</span>
        </div>
      </td>
      <td>
        <div className={styles.termSummary}>
          <strong>{enrollment.academicTerm?.academicYear?.name ?? "Year unavailable"}</strong>
          <span>{semesterLabel(enrollment.academicTerm?.semester)}</span>
        </div>
      </td>
      <td><StatusBadge status={enrollment.status} /></td>
      <td><time dateTime={enrollment.enrolledAt}>{formatDate(enrollment.enrolledAt)}</time></td>
      <td className={styles.actionCell}>
        <button
          className={styles.textButton}
          type="button"
          aria-expanded={expanded}
          aria-controls="selected-enrollment-details"
          onClick={onSelect}
        >
          {expanded ? "Close" : "Details"} <ArrowRight size={15} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function EnrollmentDetails({
  enrollment,
  student,
  onClose,
  onStatusUpdated,
}: Readonly<{
  enrollment: EnrollmentRecord;
  student: StudentSummary | null;
  onClose: () => void;
  onStatusUpdated: (message: string) => void;
}>) {
  const [statusTarget, setStatusTarget] = useState<EnrollmentStatus | "">("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transitions = allowedTransitions[enrollment.status];

  async function updateStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statusTarget || pending) return;

    const confirmation = window.confirm(
      `Change enrollment status from ${statusLabels[enrollment.status]} to ${statusLabels[statusTarget]} for ${enrollmentLabel(enrollment)}?`,
    );
    if (!confirmation) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/enrollments/${encodeURIComponent(enrollment.id)}/status`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: statusTarget }),
        },
      );
      if (!response.ok) throw new Error(await errorFromResponse(response));
      onStatusUpdated(
        `Enrollment status changed to ${statusLabels[statusTarget]}.`,
      );
      setStatusTarget("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status update failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const instructorName = enrollment.instructor
    ? fullName(enrollment.instructor)
    : "Instructor unavailable";

  return (
    <section
      className={styles.detailsPanel}
      id="selected-enrollment-details"
      aria-labelledby="enrollment-details-heading"
      aria-live="polite"
    >
      <header className={styles.detailsHeader}>
        <div>
          <p className={styles.sectionEyebrow}>ENROLLMENT DETAIL</p>
          <h2 id="enrollment-details-heading">{enrollment.course?.code ?? "Enrollment"}</h2>
        </div>
        <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close enrollment details">
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      <dl className={styles.detailGrid}>
        <div><dt>Student</dt><dd>{fullName(enrollment.student)}</dd></div>
        <div><dt>Student number</dt><dd>{enrollment.student?.studentNumber ?? "Unavailable"}</dd></div>
        <div><dt>Email</dt><dd>{student?.user?.email ?? "Not included in enrollment response"}</dd></div>
        <div><dt>Program</dt><dd>{student?.program ? `${student.program.code} · ${student.program.name}` : "Unavailable"}</dd></div>
        <div><dt>Course</dt><dd>{enrollment.course ? `${enrollment.course.code} · ${enrollment.course.title}` : "Unavailable"}</dd></div>
        <div><dt>Offering section</dt><dd>{enrollment.offering?.section ?? "Unavailable"}</dd></div>
        <div><dt>Academic year</dt><dd>{enrollment.academicTerm?.academicYear?.name ?? "Unavailable"}</dd></div>
        <div><dt>Academic term</dt><dd>{semesterLabel(enrollment.academicTerm?.semester)}</dd></div>
        <div><dt>Instructor</dt><dd>{instructorName}</dd></div>
        <div><dt>Enrollment status</dt><dd><StatusBadge status={enrollment.status} /></dd></div>
        <div><dt>Enrolled</dt><dd>{formatDateTime(enrollment.enrolledAt)}</dd></div>
        <div><dt>Created</dt><dd>{formatDateTime(enrollment.createdAt)}</dd></div>
        <div><dt>Last updated</dt><dd>{formatDateTime(enrollment.updatedAt)}</dd></div>
        <div><dt>Enrollment reference</dt><dd>{enrollment.id}</dd></div>
      </dl>

      <div className={styles.statusEditor}>
        <div>
          <h3>Enrollment status</h3>
          <p>Status transitions are validated by the enrollment service.</p>
        </div>
        {transitions.length ? (
          <form className={styles.statusForm} onSubmit={updateStatus}>
            <label className={styles.formField}>
              <span>Change status to</span>
              <select
                value={statusTarget}
                onChange={(event) => setStatusTarget(event.target.value as EnrollmentStatus | "")}
                required
              >
                <option value="">Select status</option>
                {transitions.map((status) => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            </label>
            <button className={styles.primaryButton} type="submit" disabled={pending || !statusTarget}>
              {pending ? "Updating..." : "Update status"}
            </button>
          </form>
        ) : (
          <p className={styles.formHint}>No further status transitions are supported for this enrollment.</p>
        )}
        {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      </div>
    </section>
  );
}

function CreateEnrollmentForm({
  students,
  academicYears,
  onCancel,
  onCreated,
  onRetry,
}: Readonly<{
  students: ListResult<StudentSummary>;
  academicYears: ListResult<AcademicYearOption>;
  onCancel: () => void;
  onCreated: (message: string) => void;
  onRetry: () => void;
}>) {
  const [studentId, setStudentId] = useState("");
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [offeringId, setOfferingId] = useState("");
  const [terms, setTerms] = useState<AsyncOptions<AcademicTermOption>>({
    data: null,
    error: null,
    loading: false,
  });
  const [offerings, setOfferings] = useState<AsyncOptions<OfferingOption>>({
    data: null,
    error: null,
    loading: false,
  });
  const [termRetry, setTermRetry] = useState(0);
  const [offeringRetry, setOfferingRetry] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!yearId) {
      setTerms({ data: null, error: null, loading: false });
      return;
    }

    const controller = new AbortController();
    setTerms({ data: null, error: null, loading: true });
    void fetchOptions(
      `/api/admin/admission-years/${encodeURIComponent(yearId)}/terms`,
      isAcademicTermOption,
      controller.signal,
    )
      .then((data) => {
        if (data.some((term) => term.academicYearId !== yearId)) {
          throw new Error("Academic term data did not match the selected year.");
        }
        if (!controller.signal.aborted) {
          setTerms({ data, error: null, loading: false });
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setTerms({
            data: null,
            error: caught instanceof Error ? caught.message : "Academic terms could not be loaded.",
            loading: false,
          });
        }
      });
    return () => controller.abort();
  }, [yearId, termRetry]);

  useEffect(() => {
    if (!termId) {
      setOfferings({ data: null, error: null, loading: false });
      return;
    }

    const controller = new AbortController();
    setOfferings({ data: null, error: null, loading: true });
    void fetchOptions(
      `/api/admin/course-offerings/terms/${encodeURIComponent(termId)}`,
      (value) => isOfferingOption(value, termId),
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setOfferings({ data, error: null, loading: false });
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setOfferings({
            data: null,
            error: caught instanceof Error ? caught.message : "Course offerings could not be loaded.",
            loading: false,
          });
        }
      });
    return () => controller.abort();
  }, [termId, offeringRetry]);

  async function createEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !studentId || !offeringId) {
      setError("Select a student and a course offering.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/enrollments", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, offeringId }),
      });
      if (!response.ok) throw new Error(await errorFromResponse(response));

      const student = students.data?.find((item) => item.id === studentId);
      const offering = offerings.data?.find((item) => item.id === offeringId);
      const studentName = student?.user
        ? [student.user.firstName, student.user.lastName].filter(Boolean).join(" ")
        : student?.studentNumber ?? "Student";
      const courseName = offering?.course
        ? `${offering.course.code} ${offering.course.title}`
        : "the selected course";
      onCreated(`Enrollment created for ${studentName} in ${courseName}.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Enrollment could not be created. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.createPanel} aria-labelledby="create-enrollment-heading">
      <header className={styles.detailsHeader}>
        <div>
          <p className={styles.sectionEyebrow}>NEW REGISTRATION</p>
          <h2 id="create-enrollment-heading">Create enrollment</h2>
        </div>
        <button className={styles.iconButton} type="button" onClick={onCancel} aria-label="Close enrollment form">
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      {students.error ? (
        <ErrorPanel title="Students unavailable" message={students.error} onRetry={onRetry} />
      ) : academicYears.error ? (
        <ErrorPanel title="Academic years unavailable" message={academicYears.error} onRetry={onRetry} />
      ) : students.data === null || academicYears.data === null ? (
        <p className={styles.formHint}>Student and academic-year data are required before enrollment can be created.</p>
      ) : students.data.length === 0 || academicYears.data.length === 0 ? (
        <p className={styles.formHint}>No students or academic years are available to select.</p>
      ) : (
        <form className={styles.createForm} onSubmit={createEnrollment}>
          <label className={styles.formField}>
            <span>Student</span>
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)} required>
              <option value="">Select a student</option>
              {students.data.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.studentNumber} · {student.user ? [student.user.firstName, student.user.lastName].filter(Boolean).join(" ") : "Name unavailable"} · {student.status}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.formField}>
            <span>Academic year</span>
            <select
              value={yearId}
              onChange={(event) => {
                setYearId(event.target.value);
                setTermId("");
                setOfferingId("");
              }}
              required
            >
              <option value="">Select a year</option>
              {academicYears.data.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}{year.isCurrent ? " · Current" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.formField}>
            <span>Academic term</span>
            <select
              value={termId}
              onChange={(event) => {
                setTermId(event.target.value);
                setOfferingId("");
              }}
              required
              disabled={!yearId || terms.loading || Boolean(terms.error) || !terms.data?.length}
            >
              <option value="">
                {!yearId ? "Select a year first" : terms.loading ? "Loading terms..." : terms.data?.length ? "Select a term" : "No terms available"}
              </option>
              {(terms.data ?? []).map((term) => (
                <option key={term.id} value={term.id}>
                  {semesterLabel(term.semester)}{term.isCurrent ? " · Current" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.formField}>
            <span>Course offering</span>
            <select
              value={offeringId}
              onChange={(event) => setOfferingId(event.target.value)}
              required
              disabled={!termId || offerings.loading || Boolean(offerings.error) || !offerings.data?.length}
            >
              <option value="">
                {!termId ? "Select a term first" : offerings.loading ? "Loading offerings..." : offerings.data?.length ? "Select an offering" : "No offerings available"}
              </option>
              {(offerings.data ?? []).map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {offering.course?.code ?? "Course unavailable"} · {offering.course?.title ?? "Title unavailable"} · Section {offering.section}
                </option>
              ))}
            </select>
          </label>

          {terms.error ? (
            <div className={styles.inlineError} role="alert">
              <p>{terms.error}</p>
              <RetryButton onRetry={() => setTermRetry((value) => value + 1)} />
            </div>
          ) : null}
          {offerings.error ? (
            <div className={styles.inlineError} role="alert">
              <p>{offerings.error}</p>
              <RetryButton onRetry={() => setOfferingRetry((value) => value + 1)} />
            </div>
          ) : null}

          <p className={styles.formHint}>
            The enrollment service requires an active student and an academic standing for the selected offering term. It also validates duplicate enrollment and offering capacity.
          </p>
          {error ? <p className={styles.formError} role="alert">{error}</p> : null}
          <div className={styles.formActions}>
            <button className={styles.secondaryButton} type="button" onClick={onCancel} disabled={pending}>Cancel</button>
            <button className={styles.primaryButton} type="submit" disabled={pending || terms.loading || offerings.loading || !studentId || !offeringId}>
              {pending ? "Creating..." : "Create enrollment"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}