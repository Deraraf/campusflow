"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, RefreshCw, Search, X } from "lucide-react";
import type {
  AttendanceLoad,
  AttendanceOffering,
  AttendanceRecord,
  AttendanceStatus,
} from "../../../lib/admin/attendance";
import {
  isAttendanceRecord,
} from "../../../lib/admin/attendance";
import { isRecord } from "../../../lib/admin/student-records";
import styles from "./admin-attendance.module.css";

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

const attendanceStatuses: readonly AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
];

type ScopedRecords = Readonly<{
  offeringId: string;
  data: readonly AttendanceRecord[] | null;
  error: string | null;
}>;

function personName(person: AttendanceRecord["student"]) {
  if (!person) return "Student unavailable";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || "Name unavailable";
}

function dateValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatSemester(value: string | null | undefined) {
  if (!value) return "Term unavailable";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
    // Use the status code for non-JSON responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

async function loadOfferingAttendance(
  offeringId: string,
  signal: AbortSignal,
): Promise<readonly AttendanceRecord[]> {
  const response = await fetch(
    `/api/admin/attendance/offerings/${encodeURIComponent(offeringId)}`,
    { credentials: "same-origin", cache: "no-store", signal },
  );
  if (!response.ok) throw new Error(await responseError(response));

  const payload: unknown = await response.json();
  if (
    !Array.isArray(payload) ||
    !payload.every((record) => isAttendanceRecord(record, offeringId))
  ) {
    throw new Error("Offering attendance returned data in an unexpected format.");
  }
  return payload;
}

function RetryButton({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <button className={styles.secondaryButton} type="button" onClick={onRetry}>
      <RefreshCw size={15} aria-hidden="true" />
      Retry
    </button>
  );
}

function StatusBadge({ status }: Readonly<{ status: AttendanceStatus }>) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${status}`]}`}>
      {statusLabels[status]}
    </span>
  );
}

function offeringName(offering: AttendanceOffering) {
  return `${offering.course?.code ?? "Course unavailable"} · ${offering.course?.title ?? "Title unavailable"} · Section ${offering.section}`;
}

export default function AdminAttendance({
  attendance,
  offerings,
}: Readonly<{
  attendance: AttendanceLoad<AttendanceRecord>;
  offerings: AttendanceLoad<AttendanceOffering>;
}>) {
  const router = useRouter();
  const [offeringFilter, setOfferingFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "ALL">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scopedRecords, setScopedRecords] = useState<ScopedRecords | null>(null);
  const [scopeRetry, setScopeRetry] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (offeringFilter === "ALL") {
      setScopedRecords(null);
      return;
    }

    const controller = new AbortController();
    void loadOfferingAttendance(offeringFilter, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setScopedRecords({ offeringId: offeringFilter, data, error: null });
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setScopedRecords({
            offeringId: offeringFilter,
            data: null,
            error: caught instanceof Error
              ? caught.message
              : "Offering attendance could not be loaded.",
          });
        }
      });
    return () => controller.abort();
  }, [offeringFilter, scopeRetry]);

  const offeringOptions = offerings.data ?? Array.from(
    new Map(
      (attendance.data ?? [])
        .filter((record) => record.offering)
        .map((record) => [
          record.offeringId,
          {
            id: record.offeringId,
            academicTermId: record.academicTerm?.id ?? "",
            section: record.offering!.section,
            course: record.course,
            academicTerm: record.academicTerm
              ? {
                  id: record.academicTerm.id,
                  semester: record.academicTerm.semester,
                  academicYearId: record.academicTerm.academicYear?.id ?? "",
                  academicYear: record.academicTerm.academicYear,
                }
              : null,
          } satisfies AttendanceOffering,
        ]),
    ).values(),
  );
  const termOptions = Array.from(
    new Map(
      offeringOptions
        .filter((offering) => offering.academicTerm)
        .map((offering) => [
          offering.academicTerm!.id,
          {
            id: offering.academicTerm!.id,
            academicYearId: offering.academicTerm!.academicYearId,
            yearName: offering.academicTerm!.academicYear?.name ?? "Year unavailable",
            semester: offering.academicTerm!.semester,
          },
        ]),
    ).values(),
  );
  const yearOptions = Array.from(
    new Map(
      termOptions.map((term) => [
        term.academicYearId,
        { id: term.academicYearId, name: term.yearName },
      ]),
    ).values(),
  ).filter((year) => year.id);

  const scopedPending =
    offeringFilter !== "ALL" && scopedRecords?.offeringId !== offeringFilter;
  const scopedError =
    offeringFilter !== "ALL" && scopedRecords?.offeringId === offeringFilter
      ? scopedRecords.error
      : null;
  const records =
    offeringFilter === "ALL"
      ? attendance.data
      : scopedRecords?.offeringId === offeringFilter
        ? scopedRecords.data
        : null;
  const loadError = offeringFilter === "ALL" ? attendance.error : scopedError;
  const selectedOffering = offeringOptions.find(
    (offering) => offering.id === offeringFilter,
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleRecords = (records ?? []).filter((record) => {
    const searchable = [
      personName(record.student),
      record.student?.studentNumber,
      record.course?.code,
      record.course?.title,
      record.offering?.section,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    const day = dateValue(record.date);
    return (
      searchable.includes(normalizedQuery) &&
      (yearFilter === "ALL" || record.academicTerm?.academicYear?.id === yearFilter) &&
      (termFilter === "ALL" || record.academicTerm?.id === termFilter) &&
      (statusFilter === "ALL" || record.status === statusFilter) &&
      (!startDate || day >= startDate) &&
      (!endDate || day <= endDate)
    );
  });

  const selectedRecord = (records ?? []).find((record) => record.id === selectedId);
  const statusCounts = attendanceStatuses.map((status) => ({
    status,
    count: visibleRecords.filter((record) => record.status === status).length,
  }));

  function clearFilters() {
    setOfferingFilter("ALL");
    setYearFilter("ALL");
    setTermFilter("ALL");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
    setQuery("");
    setSelectedId(null);
  }

  function retry() {
    if (offeringFilter !== "ALL") {
      setScopedRecords(null);
      setScopeRetry((value) => value + 1);
    } else {
      router.refresh();
    }
  }

  function afterUpdate(message: string) {
    setSuccess(message);
    if (offeringFilter !== "ALL") {
      setScopedRecords(null);
      setScopeRetry((value) => value + 1);
    }
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Attendance</h1>
          <p className={styles.description}>
            Review attendance records across course offerings and update existing entries.
          </p>
        </div>
      </header>

      {success ? <p className={styles.successNotice} role="status">{success}</p> : null}

      {offerings.error ? (
        <div className={styles.dataNotice} role="status">
          <span>Course offerings could not be loaded. Filters will use offerings represented in attendance records.</span>
          <RetryButton onRetry={() => router.refresh()} />
        </div>
      ) : null}

      <section className={styles.scopeBanner}>
        <CalendarDays size={18} aria-hidden="true" />
        <p>
          {offeringFilter === "ALL"
            ? "Institution-wide attendance log"
            : `Attendance for ${selectedOffering ? offeringName(selectedOffering) : "selected offering"}`}
        </p>
        <span>Records only; no attendance rate is inferred.</span>
      </section>

      <section className={styles.toolbar} aria-label="Filter attendance records">
        <label className={styles.searchField}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Search attendance</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Student name or number, course"
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
            {yearOptions.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Academic term</span>
          <select value={termFilter} onChange={(event) => setTermFilter(event.target.value)}>
            <option value="ALL">All terms</option>
            {termOptions
              .filter((term) => yearFilter === "ALL" || term.academicYearId === yearFilter)
              .map((term) => (
                <option key={term.id} value={term.id}>
                  {term.yearName} · {formatSemester(term.semester)}
                </option>
              ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Course offering</span>
          <select
            value={offeringFilter}
            onChange={(event) => {
              setOfferingFilter(event.target.value);
              setSelectedId(null);
              setSuccess(null);
            }}
          >
            <option value="ALL">All offerings</option>
            {offeringOptions.map((offering) => (
              <option key={offering.id} value={offering.id}>{offeringName(offering)}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Attendance status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AttendanceStatus | "ALL")}>
            <option value="ALL">All statuses</option>
            {attendanceStatuses.map((status) => (
              <option key={status} value={status}>{statusLabels[status]}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>From date</span>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className={styles.filterField}>
          <span>To date</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </section>

      {loadError ? (
        <section className={styles.errorPanel} role="alert">
          <div>
            <h2>Attendance records could not be loaded</h2>
            <p>{loadError}</p>
          </div>
          <RetryButton onRetry={retry} />
        </section>
      ) : scopedPending ? (
        <section className={styles.loadingPanel} aria-label="Loading offering attendance" aria-busy="true">
          <span />
          <span />
          <span />
        </section>
      ) : records === null ? (
        <section className={styles.emptyPanel}>
          <CalendarDays size={22} aria-hidden="true" />
          <h2>Attendance data unavailable</h2>
          <p>No attendance data was returned. Retry to try again.</p>
          <RetryButton onRetry={retry} />
        </section>
      ) : (
        <>
          <section className={styles.summary} aria-label="Attendance records by status">
            <p className={styles.summaryLabel}>
              {offeringFilter === "ALL" ? "Matching institution-wide records" : "Matching records in selected offering"}
            </p>
            <div className={styles.summaryStats}>
              <div><strong>{visibleRecords.length.toLocaleString()}</strong><span>Records</span></div>
              {statusCounts.map(({ status, count }) => (
                <div key={status}>
                  <strong>{count.toLocaleString()}</strong>
                  <span>{statusLabels[status]}</span>
                </div>
              ))}
            </div>
          </section>

          <p className={styles.resultCount} aria-live="polite">
            Showing {visibleRecords.length.toLocaleString()} of {records.length.toLocaleString()} records returned for this scope
          </p>

          {visibleRecords.length === 0 ? (
            <section className={styles.emptyPanel}>
              <Search size={22} aria-hidden="true" />
              <h2>{records.length === 0 ? "No attendance records" : "No matching records"}</h2>
              <p>
                {records.length === 0
                  ? offeringFilter === "ALL"
                    ? "The attendance service returned no records."
                    : "No attendance records were returned for this course offering."
                  : "Change or clear the filters to see attendance records."}
              </p>
              {records.length > 0 ? (
                <button className={styles.secondaryButton} type="button" onClick={clearFilters}>Clear filters</button>
              ) : null}
            </section>
          ) : (
            <>
              <div className={styles.desktopTable}>
                <table className={styles.attendanceTable}>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Student</th>
                      <th scope="col">Course offering</th>
                      <th scope="col">Academic term</th>
                      <th scope="col">Status</th>
                      <th scope="col"><span className={styles.visuallyHidden}>Record details</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.map((record) => (
                      <tr key={record.id}>
                        <td><time dateTime={dateValue(record.date)}>{formatDate(record.date)}</time></td>
                        <td>
                          <div className={styles.identity}>
                            <strong>{personName(record.student)}</strong>
                            <span>{record.student?.studentNumber ?? "Student number unavailable"}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.identity}>
                            <strong>{record.course?.code ?? "Course unavailable"}</strong>
                            <span>{record.course?.title ?? "Course title unavailable"}</span>
                            <span>Section {record.offering?.section ?? "Unavailable"}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.identity}>
                            <strong>{record.academicTerm?.academicYear?.name ?? "Year unavailable"}</strong>
                            <span>{formatSemester(record.academicTerm?.semester)}</span>
                          </div>
                        </td>
                        <td><StatusBadge status={record.status} /></td>
                        <td className={styles.actionCell}>
                          <button
                            className={styles.textButton}
                            type="button"
                            aria-expanded={selectedId === record.id}
                            onClick={() => {
                              setSelectedId((current) => current === record.id ? null : record.id);
                              setSuccess(null);
                            }}
                          >
                            {selectedId === record.id ? "Close" : "Details"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className={styles.mobileList}>
                {visibleRecords.map((record) => (
                  <li key={record.id} className={styles.mobileRecord}>
                    <div className={styles.mobileHeader}>
                      <div className={styles.identity}>
                        <strong>{personName(record.student)}</strong>
                        <span>{record.student?.studentNumber ?? "Student number unavailable"}</span>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className={styles.identity}>
                      <strong>{record.course?.code ?? "Course unavailable"} · Section {record.offering?.section ?? "Unavailable"}</strong>
                      <span>{record.course?.title ?? "Course title unavailable"}</span>
                    </div>
                    <p>{formatDate(record.date)} · {record.academicTerm?.academicYear?.name ?? "Year unavailable"} · {formatSemester(record.academicTerm?.semester)}</p>
                    <button
                      className={styles.textButton}
                      type="button"
                      aria-expanded={selectedId === record.id}
                      onClick={() => {
                        setSelectedId((current) => current === record.id ? null : record.id);
                        setSuccess(null);
                      }}
                    >
                      {selectedId === record.id ? "Close details" : "View details"}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {selectedRecord ? (
            <AttendanceDetails
              key={selectedRecord.id}
              record={selectedRecord}
              onClose={() => setSelectedId(null)}
              onUpdated={afterUpdate}
            />
          ) : null}
        </>
      )}
    </main>
  );
}

function AttendanceDetails({
  record,
  onClose,
  onUpdated,
}: Readonly<{
  record: AttendanceRecord;
  onClose: () => void;
  onUpdated: (message: string) => void;
}>) {
  const [date, setDate] = useState(dateValue(record.date));
  const [status, setStatus] = useState<AttendanceStatus>(record.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanges = date !== dateValue(record.date) || status !== record.status;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !hasChanges) return;
    if (!date) {
      setError("Select a valid attendance date.");
      return;
    }

    const changes: { date?: string; status?: AttendanceStatus } = {};
    if (date !== dateValue(record.date)) changes.date = date;
    if (status !== record.status) changes.status = status;

    if (!window.confirm("Save the attendance date or status change for this student and offering?")) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/attendance/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) throw new Error(await responseError(response));
      onUpdated("Attendance record updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Attendance could not be updated. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.detailsPanel} aria-labelledby="attendance-detail-heading">
      <header className={styles.detailsHeader}>
        <div>
          <p className={styles.sectionEyebrow}>ATTENDANCE RECORD</p>
          <h2 id="attendance-detail-heading">{personName(record.student)} · {formatDate(record.date)}</h2>
        </div>
        <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close attendance details">
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      <dl className={styles.detailGrid}>
        <div><dt>Student</dt><dd>{personName(record.student)}</dd></div>
        <div><dt>Student number</dt><dd>{record.student?.studentNumber ?? "Unavailable"}</dd></div>
        <div><dt>Course</dt><dd>{record.course ? `${record.course.code} · ${record.course.title}` : "Unavailable"}</dd></div>
        <div><dt>Offering section</dt><dd>{record.offering?.section ?? "Unavailable"}</dd></div>
        <div><dt>Academic year</dt><dd>{record.academicTerm?.academicYear?.name ?? "Unavailable"}</dd></div>
        <div><dt>Academic term</dt><dd>{formatSemester(record.academicTerm?.semester)}</dd></div>
        <div><dt>Attendance date</dt><dd>{formatDate(record.date)}</dd></div>
        <div><dt>Attendance status</dt><dd><StatusBadge status={record.status} /></dd></div>
        <div><dt>Record reference</dt><dd>{record.id}</dd></div>
      </dl>

      <form className={styles.editForm} onSubmit={save}>
        <h3>Update attendance</h3>
        <label className={styles.formField}>
          <span>Attendance date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className={styles.formField}>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as AttendanceStatus)} required>
            {attendanceStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
          </select>
        </label>
        {error ? <p className={styles.formError} role="alert">{error}</p> : null}
        <div className={styles.formActions}>
          <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={pending}>Cancel</button>
          <button className={styles.primaryButton} type="submit" disabled={pending || !hasChanges}>
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}