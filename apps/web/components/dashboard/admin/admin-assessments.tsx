"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, RefreshCw, Search, X } from "lucide-react";
import type {
  AssessmentLoad,
  AssessmentOffering,
  AssignmentRecord,
  ExamRecord,
  SubmissionSummary,
} from "../../../lib/admin/assessments";
import { isSubmissionSummary } from "../../../lib/admin/assessments";
import { isRecord } from "../../../lib/admin/student-records";
import styles from "./admin-assessments.module.css";

function personName(person: Readonly<{
  firstName: string | null;
  lastName: string | null;
}> | null | undefined) {
  if (!person) return "Instructor unavailable";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || "Name unavailable";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
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

function dateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function termLabel(term: Readonly<{ semester: string }> | null | undefined) {
  if (!term) return "Term unavailable";
  return term.semester
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function offeringLabel(offering: AssessmentOffering | null | undefined) {
  if (!offering) return "Offering details unavailable";
  return `${offering.course?.code ?? "Course unavailable"} · ${offering.course?.title ?? "Title unavailable"} · Section ${offering.section}`;
}

function resolveOffering(
  offeringId: string,
  offerings: readonly AssessmentOffering[] | null,
) {
  return offerings?.find((offering) => offering.id === offeringId) ?? null;
}

async function responseError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && "message" in body) {
      if (typeof body.message === "string") return body.message;
      if (Array.isArray(body.message)) {
        return body.message.filter((item) => typeof item === "string").join(" ");
      }
    }
  } catch {
    // Use a status-based message for non-JSON error responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

async function fetchSubmissionSummaries(
  assignmentId: string,
  signal: AbortSignal,
): Promise<readonly SubmissionSummary[]> {
  const response = await fetch(
    `/api/admin/assignments/${encodeURIComponent(assignmentId)}/submissions`,
    { credentials: "same-origin", cache: "no-store", signal },
  );
  if (!response.ok) throw new Error(await responseError(response));

  const result: unknown = await response.json();
  if (!Array.isArray(result) || !result.every(isSubmissionSummary)) {
    throw new Error("Submission data returned an unexpected format.");
  }
  return result;
}

function RetryButton({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <button className={styles.secondaryButton} type="button" onClick={onRetry}>
      <RefreshCw size={15} aria-hidden="true" /> Retry
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
      <div><h2>{title}</h2><p>{message}</p></div>
      <RetryButton onRetry={onRetry} />
    </section>
  );
}

export function AdminAssignments({
  assignments,
  offerings,
}: Readonly<{
  assignments: AssessmentLoad<AssignmentRecord>;
  offerings: AssessmentLoad<AssessmentOffering>;
}>) {
  const router = useRouter();
  const records = assignments.data ?? [];
  const [query, setQuery] = useState("");
  const [offeringFilter, setOfferingFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [instructorFilter, setInstructorFilter] = useState("ALL");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Readonly<{
    assignmentId: string;
    data: readonly SubmissionSummary[] | null;
    error: string | null;
  }> | null>(null);
  const [submissionRetry, setSubmissionRetry] = useState(0);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selected = records.find((assignment) => assignment.id === selectedId) ?? null;
  const selectedOffering = selected
    ? resolveOffering(selected.offeringId, offerings.data)
    : null;

  useEffect(() => {
    if (!selectedId) {
      setSubmissions(null);
      return;
    }
    const controller = new AbortController();
    void fetchSubmissionSummaries(selectedId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSubmissions({ assignmentId: selectedId, data, error: null });
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setSubmissions({
            assignmentId: selectedId,
            data: null,
            error: caught instanceof Error
              ? caught.message
              : "Submissions could not be loaded.",
          });
        }
      });
    return () => controller.abort();
  }, [selectedId, submissionRetry]);

  const terms = Array.from(new Map(
    (offerings.data ?? [])
      .filter((offering) => offering.academicTerm)
      .map((offering) => [offering.academicTerm!.id, {
        id: offering.academicTerm!.id,
        yearName: offering.academicTerm!.academicYear?.name ?? "Year unavailable",
        semester: offering.academicTerm!.semester,
      }]),
  ).values());
  const instructors = Array.from(new Map(
    records
      .filter((assignment) => assignment.instructor)
      .map((assignment) => [assignment.instructor!.id, assignment.instructor!]),
  ).values()).sort((left, right) => personName(left).localeCompare(personName(right)));

  const needle = query.trim().toLocaleLowerCase();
  const visible = records.filter((assignment) => {
    const offering = resolveOffering(assignment.offeringId, offerings.data);
    const searchable = [
      assignment.title,
      assignment.description,
      assignment.offering?.course?.code,
      assignment.offering?.course?.title,
      assignment.offering?.section,
      personName(assignment.instructor),
      offering?.academicTerm?.academicYear?.name,
      offering?.academicTerm?.semester,
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    const dueDay = assignment.dueDate.slice(0, 10);
    return searchable.includes(needle) &&
      (offeringFilter === "ALL" || assignment.offeringId === offeringFilter) &&
      (termFilter === "ALL" || offering?.academicTerm?.id === termFilter) &&
      (instructorFilter === "ALL" || assignment.instructorId === instructorFilter) &&
      (!dueFrom || dueDay >= dueFrom) && (!dueTo || dueDay <= dueTo);
  });

  async function removeAssignment() {
    if (!selected || deletePending) return;
    const accepted = window.confirm(
      `Delete “${selected.title}”? The backend will reject deletion if submissions exist.`,
    );
    if (!accepted) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admin/assignments/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await responseError(response));
      setSuccess(`Assignment “${selected.title}” was deleted.`);
      setSelectedId(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Assignment could not be deleted.");
    } finally {
      setDeletePending(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setOfferingFilter("ALL");
    setTermFilter("ALL");
    setInstructorFilter("ALL");
    setDueFrom("");
    setDueTo("");
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Assignments</h1>
          <p className={styles.description}>Browse assignments, review submission summaries, and maintain existing assignment details.</p>
        </div>
      </header>

      {success ? <p className={styles.successNotice} role="status">{success}</p> : null}
      {offerings.error ? (
        <div className={styles.dataNotice} role="status">
          Academic-term enrichment is unavailable; assignment and course data remain available.
          <RetryButton onRetry={() => router.refresh()} />
        </div>
      ) : null}

      <section className={styles.toolbar} aria-label="Filter assignments">
        <label className={styles.searchField}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Search assignments</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, course, offering, or instructor" />
        </label>
        <label className={styles.filterField}>
          <span>Course offering</span>
          <select value={offeringFilter} onChange={(event) => setOfferingFilter(event.target.value)}>
            <option value="ALL">All offerings</option>
            {(offerings.data ?? []).map((offering) => <option key={offering.id} value={offering.id}>{offeringLabel(offering)}</option>)}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Academic term</span>
          <select value={termFilter} onChange={(event) => setTermFilter(event.target.value)}>
            <option value="ALL">All terms</option>
            {terms.map((term) => <option key={term.id} value={term.id}>{term.yearName} · {termLabel(term)}</option>)}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Instructor</span>
          <select value={instructorFilter} onChange={(event) => setInstructorFilter(event.target.value)}>
            <option value="ALL">All instructors</option>
            {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{personName(instructor)}</option>)}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Due from</span>
          <input type="date" value={dueFrom} max={dueTo || undefined} onChange={(event) => setDueFrom(event.target.value)} />
        </label>
        <label className={styles.filterField}>
          <span>Due to</span>
          <input type="date" value={dueTo} min={dueFrom || undefined} onChange={(event) => setDueTo(event.target.value)} />
        </label>
      </section>

      {assignments.error ? (
        <ErrorPanel title="Assignments could not be loaded" message={assignments.error} onRetry={() => router.refresh()} />
      ) : assignments.data === null ? (
        <EmptyPanel title="Assignment list unavailable" message="No assignment data was returned. Retry to try again." onRetry={() => router.refresh()} />
      ) : records.length === 0 ? (
        <EmptyPanel title="No assignments" message="The assignment service returned no assignment records." />
      ) : (
        <>
          <p className={styles.resultCount} aria-live="polite">Showing {visible.length.toLocaleString()} of {records.length.toLocaleString()} assignments returned</p>
          {visible.length === 0 ? (
            <EmptyPanel title="No matching assignments" message="Change or clear the filters to see assignments." onClear={clearFilters} />
          ) : (
            <>
              <div className={styles.desktopTable}>
                <table className={styles.assessmentTable}>
                  <thead><tr><th scope="col">Assignment</th><th scope="col">Course offering</th><th scope="col">Academic term</th><th scope="col">Instructor</th><th scope="col">Due</th><th scope="col">Max score</th><th scope="col"><span className={styles.visuallyHidden}>Actions</span></th></tr></thead>
                  <tbody>
                    {visible.map((assignment) => {
                      const offering = resolveOffering(assignment.offeringId, offerings.data);
                      return (
                        <tr key={assignment.id}>
                          <td><div className={styles.identity}><strong>{assignment.title}</strong><span>{assignment.description || "No description"}</span></div></td>
                          <td><div className={styles.identity}><strong>{assignment.offering?.course?.code ?? "Course unavailable"}</strong><span>{assignment.offering?.course?.title ?? "Course title unavailable"} · Section {assignment.offering?.section ?? "Unavailable"}</span></div></td>
                          <td><div className={styles.identity}><strong>{offering?.academicTerm?.academicYear?.name ?? "Year unavailable"}</strong><span>{termLabel(offering?.academicTerm)}</span></div></td>
                          <td>{personName(assignment.instructor)}</td>
                          <td><time dateTime={assignment.dueDate}>{formatDateTime(assignment.dueDate)}</time></td>
                          <td>{assignment.maxScore}</td>
                          <td className={styles.actionCell}><button className={styles.textButton} type="button" aria-expanded={selectedId === assignment.id} onClick={() => { setSelectedId((current) => current === assignment.id ? null : assignment.id); setSuccess(null); setDeleteError(null); }}>Details</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className={styles.mobileList}>
                {visible.map((assignment) => {
                  const offering = resolveOffering(assignment.offeringId, offerings.data);
                  return (
                    <li className={styles.mobileCard} key={assignment.id}>
                      <div className={styles.mobileHeading}><div className={styles.identity}><strong>{assignment.title}</strong><span>{assignment.offering?.course?.code ?? "Course unavailable"} · Section {assignment.offering?.section ?? "Unavailable"}</span></div><span className={styles.scoreBadge}>{assignment.maxScore} pts</span></div>
                      <p>{assignment.description || "No description"}</p>
                      <p>{offering?.academicTerm?.academicYear?.name ?? "Year unavailable"} · {termLabel(offering?.academicTerm)} · Due {formatDate(assignment.dueDate)}</p>
                      <button className={styles.textButton} type="button" onClick={() => setSelectedId(assignment.id)}>View assignment details</button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}

      {selected ? (
        <section className={styles.detailPanel} aria-labelledby="assignment-details-heading">
          <header className={styles.detailHeader}>
            <div><p className={styles.sectionEyebrow}>ASSIGNMENT DETAIL</p><h2 id="assignment-details-heading">{selected.title}</h2></div>
            <button className={styles.iconButton} type="button" onClick={() => setSelectedId(null)} aria-label="Close assignment details"><X size={17} aria-hidden="true" /></button>
          </header>
          <dl className={styles.detailGrid}>
            <div><dt>Description</dt><dd>{selected.description || "No description"}</dd></div>
            <div><dt>Course offering</dt><dd>{offeringLabel(selectedOffering)}</dd></div>
            <div><dt>Academic term</dt><dd>{selectedOffering?.academicTerm?.academicYear?.name ?? "Year unavailable"} · {termLabel(selectedOffering?.academicTerm)}</dd></div>
            <div><dt>Instructor</dt><dd>{personName(selected.instructor)}</dd></div>
            <div><dt>Due date</dt><dd>{formatDateTime(selected.dueDate)}</dd></div>
            <div><dt>Maximum score</dt><dd>{selected.maxScore}</dd></div>
          </dl>

          <AssignmentEditForm key={selected.id} assignment={selected} onSaved={(message) => { setSuccess(message); router.refresh(); }} />

          <div className={styles.dangerActions}>
            <div><h3>Delete assignment</h3><p>Deletion is unavailable when submissions exist.</p></div>
            {deleteError ? <p className={styles.formError} role="alert">{deleteError}</p> : null}
            <button className={styles.dangerButton} type="button" onClick={removeAssignment} disabled={deletePending}>{deletePending ? "Deleting..." : "Delete assignment"}</button>
          </div>

          <section className={styles.submissionSection} aria-labelledby="submissions-heading">
            <div className={styles.sectionTitle}><div><p className={styles.sectionEyebrow}>STUDENT WORK</p><h3 id="submissions-heading">Submissions</h3></div>{submissions?.assignmentId === selected.id && submissions.data ? <span>{submissions.data.length} submissions</span> : null}</div>
            {submissions?.assignmentId !== selected.id ? (
              <div className={styles.loadingPanel} aria-busy="true" aria-label="Loading submissions"><span /><span /></div>
            ) : submissions.error ? (
              <ErrorPanel title="Submissions could not be loaded" message={submissions.error} onRetry={() => { setSubmissions(null); setSubmissionRetry((value) => value + 1); }} />
            ) : submissions.data?.length === 0 ? (
              <p className={styles.sectionEmpty}>No submissions were returned for this assignment.</p>
            ) : (
              <div className={styles.desktopTable}>
                <table className={styles.assessmentTable}>
                  <thead><tr><th scope="col">Student</th><th scope="col">Student number</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col">Score</th></tr></thead>
                  <tbody>{(submissions.data ?? []).map((submission) => (
                    <tr key={submission.id}>
                      <td>{personName(submission.student)}</td><td>{submission.student?.studentNumber ?? "Unavailable"}</td><td><time dateTime={submission.submittedAt}>{formatDateTime(submission.submittedAt)}</time></td><td><span className={`${styles.statusBadge} ${styles[`submission${submission.status}`]}`}>{submission.status}</span></td><td>{submission.score === null ? "Not graded" : `${submission.score} / ${selected.maxScore}`}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <p className={styles.formHint}>The API returns submission summaries only. Submission content and file references are not exposed here; grading is Instructor-only.</p>
          </section>
        </section>
      ) : null}
    </main>
  );
}

function AssignmentEditForm({
  assignment,
  onSaved,
}: Readonly<{ assignment: AssignmentRecord; onSaved: (message: string) => void }>) {
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description ?? "");
  const [dueDate, setDueDate] = useState(dateTimeInput(assignment.dueDate));
  const [maxScore, setMaxScore] = useState(String(assignment.maxScore));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = title !== assignment.title || description !== (assignment.description ?? "") || dueDate !== dateTimeInput(assignment.dueDate) || Number(maxScore) !== assignment.maxScore;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !dirty) return;
    const score = Number(maxScore);
    if (!title.trim() || !dueDate || !Number.isInteger(score) || score < 1) {
      setError("Enter a title, valid due date, and positive whole-number maximum score.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/assignments/${encodeURIComponent(assignment.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          dueDate: new Date(dueDate).toISOString(),
          maxScore: score,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      onSaved(`Assignment “${title.trim()}” updated.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assignment could not be updated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.editForm} onSubmit={save}>
      <h3>Edit assignment</h3>
      <label className={styles.formField}><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} /></label>
      <label className={styles.formField}><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>
      <label className={styles.formField}><span>Due date</span><input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label>
      <label className={styles.formField}><span>Maximum score</span><input type="number" min="1" step="1" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} required /></label>
      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      <div className={styles.formActions}><button className={styles.secondaryButton} type="button" onClick={() => { setTitle(assignment.title); setDescription(assignment.description ?? ""); setDueDate(dateTimeInput(assignment.dueDate)); setMaxScore(String(assignment.maxScore)); setError(null); }} disabled={pending}>Reset</button><button className={styles.primaryButton} type="submit" disabled={pending || !dirty}>{pending ? "Saving..." : "Save changes"}</button></div>
    </form>
  );
}

export function AdminExams({
  exams,
  offerings,
}: Readonly<{
  exams: AssessmentLoad<ExamRecord>;
  offerings: AssessmentLoad<AssessmentOffering>;
}>) {
  const router = useRouter();
  const records = exams.data ?? [];
  const [query, setQuery] = useState("");
  const [offeringFilter, setOfferingFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [instructorFilter, setInstructorFilter] = useState("ALL");
  const [examFrom, setExamFrom] = useState("");
  const [examTo, setExamTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selected = records.find((exam) => exam.id === selectedId) ?? null;
  const selectedOffering = selected ? resolveOffering(selected.offeringId, offerings.data) : null;
  const terms = Array.from(new Map(
    (offerings.data ?? [])
      .filter((offering) => offering.academicTerm)
      .map((offering) => [offering.academicTerm!.id, {
        id: offering.academicTerm!.id,
        yearName: offering.academicTerm!.academicYear?.name ?? "Year unavailable",
        semester: offering.academicTerm!.semester,
      }]),
  ).values());
  const instructors = Array.from(new Map(
    records
      .filter((exam) => exam.instructor)
      .map((exam) => [exam.instructor!.id, exam.instructor!]),
  ).values()).sort((left, right) => personName(left).localeCompare(personName(right)));

  const needle = query.trim().toLocaleLowerCase();
  const visible = records.filter((exam) => {
    const offering = resolveOffering(exam.offeringId, offerings.data);
    const searchable = [exam.title, exam.course?.code, exam.course?.title,
      exam.offering?.section, personName(exam.instructor),
      offering?.academicTerm?.academicYear?.name, exam.academicTerm?.semester]
      .filter(Boolean).join(" ").toLocaleLowerCase();
    const day = exam.examDate?.slice(0, 10) ?? "";
    return searchable.includes(needle) &&
      (offeringFilter === "ALL" || exam.offeringId === offeringFilter) &&
      (termFilter === "ALL" || exam.academicTerm?.id === termFilter) &&
      (instructorFilter === "ALL" || exam.instructor?.id === instructorFilter) &&
      (!examFrom || day >= examFrom) && (!examTo || day <= examTo);
  });

  function clearFilters() {
    setQuery(""); setOfferingFilter("ALL"); setTermFilter("ALL");
    setInstructorFilter("ALL"); setExamFrom(""); setExamTo("");
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Exams</h1>
          <p className={styles.description}>Browse scheduled exams and update existing exam details.</p>
        </div>
      </header>
      {success ? <p className={styles.successNotice} role="status">{success}</p> : null}
      {offerings.error ? <div className={styles.dataNotice} role="status">Academic-year labels are unavailable; exam and course data remain available.<RetryButton onRetry={() => router.refresh()} /></div> : null}

      <section className={styles.toolbar} aria-label="Filter exams">
        <label className={styles.searchField}><Search size={17} aria-hidden="true" /><span className={styles.visuallyHidden}>Search exams</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Exam, course, offering, or instructor" /></label>
        <label className={styles.filterField}><span>Course offering</span><select value={offeringFilter} onChange={(event) => setOfferingFilter(event.target.value)}><option value="ALL">All offerings</option>{(offerings.data ?? []).map((offering) => <option key={offering.id} value={offering.id}>{offeringLabel(offering)}</option>)}</select></label>
        <label className={styles.filterField}><span>Academic term</span><select value={termFilter} onChange={(event) => setTermFilter(event.target.value)}><option value="ALL">All terms</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.yearName} · {termLabel(term)}</option>)}</select></label>
        <label className={styles.filterField}><span>Instructor</span><select value={instructorFilter} onChange={(event) => setInstructorFilter(event.target.value)}><option value="ALL">All instructors</option>{instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{personName(instructor)}</option>)}</select></label>
        <label className={styles.filterField}><span>Exam date from</span><input type="date" value={examFrom} max={examTo || undefined} onChange={(event) => setExamFrom(event.target.value)} /></label>
        <label className={styles.filterField}><span>Exam date to</span><input type="date" value={examTo} min={examFrom || undefined} onChange={(event) => setExamTo(event.target.value)} /></label>
      </section>

      {exams.error ? <ErrorPanel title="Exams could not be loaded" message={exams.error} onRetry={() => router.refresh()} /> : exams.data === null ? <EmptyPanel title="Exam list unavailable" message="No exam data was returned. Retry to try again." onRetry={() => router.refresh()} /> : records.length === 0 ? <EmptyPanel title="No exams" message="The exam service returned no exam records." /> : (
        <>
          <p className={styles.resultCount} aria-live="polite">Showing {visible.length.toLocaleString()} of {records.length.toLocaleString()} exams returned</p>
          {visible.length === 0 ? <EmptyPanel title="No matching exams" message="Change or clear the filters to see exams." onClear={clearFilters} /> : <>
            <div className={styles.desktopTable}><table className={styles.assessmentTable}>
              <thead><tr><th scope="col">Exam</th><th scope="col">Course offering</th><th scope="col">Academic term</th><th scope="col">Instructor</th><th scope="col">Exam date</th><th scope="col">Max score</th><th scope="col"><span className={styles.visuallyHidden}>Actions</span></th></tr></thead>
              <tbody>{visible.map((exam) => {
                const offering = resolveOffering(exam.offeringId, offerings.data);
                return <tr key={exam.id}><td><div className={styles.identity}><strong>{exam.title}</strong></div></td><td><div className={styles.identity}><strong>{exam.course?.code ?? "Course unavailable"}</strong><span>{exam.course?.title ?? "Course title unavailable"} · Section {exam.offering?.section ?? "Unavailable"}</span></div></td><td><div className={styles.identity}><strong>{offering?.academicTerm?.academicYear?.name ?? "Year unavailable"}</strong><span>{termLabel(exam.academicTerm)}</span></div></td><td>{personName(exam.instructor)}</td><td>{exam.examDate ? <time dateTime={exam.examDate}>{formatDate(exam.examDate)}</time> : "Date unavailable"}</td><td>{exam.maxScore}</td><td className={styles.actionCell}><button className={styles.textButton} type="button" aria-expanded={selectedId === exam.id} onClick={() => { setSelectedId((current) => current === exam.id ? null : exam.id); setSuccess(null); }}>Details</button></td></tr>;
              })}</tbody>
            </table></div>
            <ul className={styles.mobileList}>{visible.map((exam) => <li className={styles.mobileCard} key={exam.id}><div className={styles.mobileHeading}><div className={styles.identity}><strong>{exam.title}</strong><span>{exam.course?.code ?? "Course unavailable"} · Section {exam.offering?.section ?? "Unavailable"}</span></div><span className={styles.scoreBadge}>{exam.maxScore} pts</span></div><p>{exam.course?.title ?? "Course title unavailable"} · {formatDate(exam.examDate)}</p><p>{resolveOffering(exam.offeringId, offerings.data)?.academicTerm?.academicYear?.name ?? "Year unavailable"} · {termLabel(exam.academicTerm)}</p><button className={styles.textButton} type="button" onClick={() => setSelectedId(exam.id)}>View exam details</button></li>)}</ul>
          </>}
        </>
      )}

      {selected ? <section className={styles.detailPanel} aria-labelledby="exam-details-heading">
        <header className={styles.detailHeader}><div><p className={styles.sectionEyebrow}>EXAM DETAIL</p><h2 id="exam-details-heading">{selected.title}</h2></div><button className={styles.iconButton} type="button" onClick={() => setSelectedId(null)} aria-label="Close exam details"><X size={17} aria-hidden="true" /></button></header>
        <dl className={styles.detailGrid}>
          <div><dt>Course</dt><dd>{selected.course ? `${selected.course.code} · ${selected.course.title}` : "Unavailable"}</dd></div>
          <div><dt>Course offering</dt><dd>{offeringLabel(selectedOffering)}</dd></div>
          <div><dt>Academic year</dt><dd>{selectedOffering?.academicTerm?.academicYear?.name ?? "Unavailable"}</dd></div>
          <div><dt>Academic term</dt><dd>{termLabel(selected.academicTerm)}</dd></div>
          <div><dt>Exam date</dt><dd>{formatDate(selected.examDate)}</dd></div>
          <div><dt>Exam window</dt><dd>{selected.academicTerm ? `${formatDate(selected.academicTerm.startDate)} – ${formatDate(selected.academicTerm.endDate)}` : "Unavailable"}</dd></div>
          <div><dt>Instructor</dt><dd>{personName(selected.instructor)}</dd></div>
          <div><dt>Maximum score</dt><dd>{selected.maxScore}</dd></div>
        </dl>
        <ExamEditForm key={selected.id} exam={selected} onSaved={(message) => { setSuccess(message); router.refresh(); }} />
        <div className={styles.resultsNotice}><CalendarDays size={17} aria-hidden="true" /><p>Exam results are not available through this exam API. The grade API exposes final grades linked to enrollments, not to individual exams.</p></div>
      </section> : null}
    </main>
  );
}

function ExamEditForm({ exam, onSaved }: Readonly<{ exam: ExamRecord; onSaved: (message: string) => void }>) {
  const [title, setTitle] = useState(exam.title);
  const [examDate, setExamDate] = useState(exam.examDate ? exam.examDate.slice(0, 10) : "");
  const [maxScore, setMaxScore] = useState(String(exam.maxScore));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = title !== exam.title || examDate !== (exam.examDate?.slice(0, 10) ?? "") || Number(maxScore) !== exam.maxScore;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !dirty) return;
    const score = Number(maxScore);
    if (!title.trim() || !examDate || !Number.isInteger(score) || score <= 0) {
      setError("Enter a title, valid exam date, and positive whole-number maximum score.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/exams/${encodeURIComponent(exam.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), examDate, maxScore: score }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      onSaved(`Exam “${title.trim()}” updated.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Exam could not be updated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.editForm} onSubmit={save}>
      <h3>Edit exam</h3>
      <label className={styles.formField}><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label className={styles.formField}><span>Exam date</span><input type="date" value={examDate} min={exam.academicTerm?.startDate?.slice(0, 10)} max={exam.academicTerm?.endDate?.slice(0, 10)} onChange={(event) => setExamDate(event.target.value)} required /></label>
      <label className={styles.formField}><span>Maximum score</span><input type="number" min="1" step="1" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} required /></label>
      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      <div className={styles.formActions}><button className={styles.secondaryButton} type="button" disabled={pending} onClick={() => { setTitle(exam.title); setExamDate(exam.examDate?.slice(0, 10) ?? ""); setMaxScore(String(exam.maxScore)); setError(null); }}>Reset</button><button className={styles.primaryButton} type="submit" disabled={pending || !dirty}>{pending ? "Saving..." : "Save changes"}</button></div>
    </form>
  );
}

function EmptyPanel({
  title,
  message,
  onRetry,
  onClear,
}: Readonly<{ title: string; message: string; onRetry?: () => void; onClear?: () => void }>) {
  return (
    <section className={styles.emptyPanel}>
      <BookOpen size={22} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry ? <RetryButton onRetry={onRetry} /> : null}
      {onClear ? <button className={styles.secondaryButton} type="button" onClick={onClear}>Clear filters</button> : null}
    </section>
  );
}