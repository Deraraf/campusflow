"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, RefreshCw, Search, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import type {
  AcademicStanding,
  EnrollmentStatus,
  LoadResult,
  StudentEnrollment,
  StudentProfile,
  StudentStatus,
  StudentSummary,
} from "../../../lib/admin/student-records";
import styles from "./admin-student-records.module.css";

const statusLabels: Record<StudentStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  GRADUATED: "Graduated",
  WITHDRAWN: "Withdrawn",
};

const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  ACTIVE: "Active",
  DROPPED: "Dropped",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

function fullName(
  person: Readonly<{ firstName: string; lastName: string }> | null,
) {
  return person
    ? [person.firstName, person.lastName].filter(Boolean).join(" ") || "Name unavailable"
    : "User details unavailable";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function labelSemester(value: string | null | undefined) {
  return value ? value.toLowerCase().replaceAll("_", " ") : "Term unavailable";
}

function RetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      className={styles.secondaryButton}
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw size={15} aria-hidden="true" />
      {isPending ? "Retrying..." : "Retry"}
    </button>
  );
}

function ErrorPanel({
  title,
  message,
}: Readonly<{ title: string; message: string }>) {
  return (
    <div className={styles.errorPanel} role="alert">
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      <RetryButton />
    </div>
  );
}

export default function AdminStudentDirectory({
  students,
  loadError,
}: Readonly<{
  students: readonly StudentSummary[] | null;
  loadError: string | null;
}>) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const programs = Array.from(
    new Map(
      (students ?? [])
        .filter((student) => student.program)
        .map((student) => [student.program!.id, student.program!]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));
  const departments = Array.from(
    new Map(
      (students ?? [])
        .filter((student) => student.program?.department)
        .map((student) => [
          student.program!.department!.id,
          student.program!.department!,
        ]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleStudents = (students ?? []).filter((student) => {
    const searchable = [
      student.studentNumber,
      student.user?.firstName,
      student.user?.lastName,
      student.user?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      searchable.includes(normalizedQuery) &&
      (programFilter === "ALL" || student.program?.id === programFilter) &&
      (departmentFilter === "ALL" ||
        student.program?.department?.id === departmentFilter) &&
      (statusFilter === "ALL" || student.status === statusFilter)
    );
  });

  function clearFilters() {
    setQuery("");
    setProgramFilter("ALL");
    setDepartmentFilter("ALL");
    setStatusFilter("ALL");
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Student records</h1>
          <p className={styles.description}>
            Review student profiles, academic standing, and course enrollment.
          </p>
        </div>
        {students ? (
          <p className={styles.totalCount}>
            {students.length.toLocaleString()} student profiles
          </p>
        ) : null}
      </header>

      {loadError ? (
        <ErrorPanel title="Student directory unavailable" message={loadError} />
      ) : students === null ? (
        <section className={styles.emptyPanel}>
          <UserRound size={22} aria-hidden="true" />
          <h2>Student profiles unavailable</h2>
          <p>No student data was returned. Refresh to try again.</p>
          <RetryButton />
        </section>
      ) : students.length === 0 ? (
        <section className={styles.emptyPanel}>
          <UserRound size={22} aria-hidden="true" />
          <h2>No student profiles</h2>
          <p>The student directory did not return any profiles.</p>
        </section>
      ) : (
        <>
          <section className={styles.toolbar} aria-label="Filter student directory">
            <label className={styles.searchField}>
              <Search size={17} aria-hidden="true" />
              <span className={styles.visuallyHidden}>Search students</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, email, or student number"
              />
            </label>
            <label className={styles.filterField}>
              <span>Program</span>
              <select
                value={programFilter}
                onChange={(event) => setProgramFilter(event.target.value)}
              >
                <option value="ALL">All programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code} · {program.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Department</span>
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
              >
                <option value="ALL">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code} · {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Profile status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <p className={styles.resultCount} aria-live="polite">
            Showing {visibleStudents.length.toLocaleString()} of {students.length.toLocaleString()} profiles
          </p>

          {visibleStudents.length === 0 ? (
            <section className={styles.emptyPanel}>
              <Search size={22} aria-hidden="true" />
              <h2>No matching students</h2>
              <p>Change or clear the search and filters to see profiles.</p>
              <button className={styles.secondaryButton} type="button" onClick={clearFilters}>
                Clear filters
              </button>
            </section>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.studentTable}>
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Program / department</th>
                      <th scope="col">Program year</th>
                      <th scope="col">Admission year</th>
                      <th scope="col">Profile status</th>
                      <th scope="col"><span className={styles.visuallyHidden}>Record</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div className={styles.studentIdentity}>
                            <strong>{fullName(student.user)}</strong>
                            <span>{student.studentNumber}</span>
                            <span>{student.user?.email ?? "Email unavailable"}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.programIdentity}>
                            <strong>{student.program?.name ?? "Program unavailable"}</strong>
                            <span>
                              {student.program?.code ?? ""}
                              {student.program?.department
                                ? ` · ${student.program.department.name}`
                                : " · Department unavailable"}
                            </span>
                          </div>
                        </td>
                        <td>
                          {student.currentAcademicStanding
                            ? `Year ${student.currentAcademicStanding.programYear}`
                            : "No current standing"}
                        </td>
                        <td>{student.admissionAcademicYear?.name ?? "Unavailable"}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[`status${student.status}`]}`}>
                            {statusLabels[student.status]}
                          </span>
                        </td>
                        <td className={styles.actionCell}>
                          <Link className={styles.recordLink} href={`/admin/student-records/${encodeURIComponent(student.id)}`}>
                            View record <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className={styles.mobileStudents}>
                {visibleStudents.map((student) => (
                  <li key={student.id} className={styles.mobileStudent}>
                    <div className={styles.mobileStudentHeader}>
                      <div className={styles.studentIdentity}>
                        <strong>{fullName(student.user)}</strong>
                        <span>{student.studentNumber}</span>
                        <span>{student.user?.email ?? "Email unavailable"}</span>
                      </div>
                      <span className={`${styles.statusBadge} ${styles[`status${student.status}`]}`}>
                        {statusLabels[student.status]}
                      </span>
                    </div>
                    <dl className={styles.mobileFacts}>
                      <div>
                        <dt>Program</dt>
                        <dd>{student.program?.code} · {student.program?.name ?? "Unavailable"}</dd>
                      </div>
                      <div>
                        <dt>Department</dt>
                        <dd>{student.program?.department?.name ?? "Unavailable"}</dd>
                      </div>
                      <div>
                        <dt>Program year</dt>
                        <dd>{student.currentAcademicStanding ? `Year ${student.currentAcademicStanding.programYear}` : "No current standing"}</dd>
                      </div>
                      <div>
                        <dt>Admission year</dt>
                        <dd>{student.admissionAcademicYear?.name ?? "Unavailable"}</dd>
                      </div>
                    </dl>
                    <Link className={styles.recordLink} href={`/admin/student-records/${encodeURIComponent(student.id)}`}>
                      Open academic record <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}

function SectionHeader({
  headingId,
  eyebrow,
  title,
  count,
}: Readonly<{
  headingId: string;
  eyebrow: string;
  title: string;
  count?: number;
}>) {
  return (
    <header className={styles.sectionHeader}>
      <div>
        <p className={styles.sectionEyebrow}>{eyebrow}</p>
        <h2 id={headingId}>{title}</h2>
      </div>
      {count !== undefined ? <span>{count} {count === 1 ? "record" : "records"}</span> : null}
    </header>
  );
}

function ProfileDetails({ profile }: Readonly<{ profile: StudentProfile }>) {
  return (
    <dl className={styles.profileFacts}>
      <div>
        <dt>Name</dt>
        <dd>{fullName(profile.user)}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{profile.user?.email ?? "Unavailable"}</dd>
      </div>
      <div>
        <dt>Student number</dt>
        <dd>{profile.studentNumber}</dd>
      </div>
      <div>
        <dt>Profile status</dt>
        <dd>
          <span className={`${styles.statusBadge} ${styles[`status${profile.status}`]}`}>
            {statusLabels[profile.status]}
          </span>
        </dd>
      </div>
      <div>
        <dt>Program</dt>
        <dd>{profile.program ? `${profile.program.code} · ${profile.program.name}` : "Unavailable"}</dd>
      </div>
      <div>
        <dt>Department</dt>
        <dd>{profile.program?.department ? `${profile.program.department.code} · ${profile.program.department.name}` : "Unavailable"}</dd>
      </div>
      <div>
        <dt>Program duration</dt>
        <dd>{profile.program ? `${profile.program.durationYears} years` : "Unavailable"}</dd>
      </div>
      <div>
        <dt>Admission academic year</dt>
        <dd>{profile.admissionAcademicYear?.name ?? "Unavailable"}</dd>
      </div>
      <div>
        <dt>Admission year dates</dt>
        <dd>
          {profile.admissionAcademicYear
            ? `${formatDate(profile.admissionAcademicYear.startDate)} – ${formatDate(profile.admissionAcademicYear.endDate)}`
            : "Unavailable"}
        </dd>
      </div>
    </dl>
  );
}

function StandingHistory({ standings }: Readonly<{ standings: readonly AcademicStanding[] }>) {
  if (standings.length === 0) {
    return <p className={styles.sectionEmpty}>No academic standing records were returned for this student.</p>;
  }

  return (
    <ol className={styles.standingList}>
      {standings.map((standing) => (
        <li key={standing.id}>
          <span className={styles.timelineMarker} aria-hidden="true" />
          <div className={styles.standingContent}>
            <div className={styles.standingHeading}>
              <strong>{standing.academicTerm?.academicYear?.name ?? "Academic year unavailable"}</strong>
              {standing.academicTerm?.isCurrent ? <span className={styles.currentBadge}>Current term</span> : null}
            </div>
            <p>{labelSemester(standing.academicTerm?.semester)} · Program year {standing.programYear}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function EnrollmentList({ enrollments }: Readonly<{ enrollments: readonly StudentEnrollment[] }>) {
  if (enrollments.length === 0) {
    return <p className={styles.sectionEmpty}>No course enrollments were returned for this student.</p>;
  }

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.enrollmentTable}>
          <thead>
            <tr>
              <th scope="col">Course</th>
              <th scope="col">Offering</th>
              <th scope="col">Academic term</th>
              <th scope="col">Instructor</th>
              <th scope="col">Enrollment status</th>
              <th scope="col">Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id}>
                <td>
                  <div className={styles.programIdentity}>
                    <strong>{enrollment.course?.code ?? "Course unavailable"}</strong>
                    <span>{enrollment.course?.title ?? "Course details unavailable"}</span>
                  </div>
                </td>
                <td>{enrollment.offering?.section ?? "Unavailable"}</td>
                <td>
                  <div className={styles.programIdentity}>
                    <strong>{enrollment.academicTerm?.academicYear?.name ?? "Year unavailable"}</strong>
                    <span>{labelSemester(enrollment.academicTerm?.semester)}</span>
                  </div>
                </td>
                <td>{fullName(enrollment.instructor && enrollment.instructor.firstName !== null && enrollment.instructor.lastName !== null
                  ? { firstName: enrollment.instructor.firstName, lastName: enrollment.instructor.lastName }
                  : null)}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[`enrollment${enrollment.status}`]}`}>
                    {enrollmentStatusLabels[enrollment.status]}
                  </span>
                </td>
                <td>{formatDate(enrollment.enrolledAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={styles.mobileEnrollments}>
        {enrollments.map((enrollment) => (
          <li key={enrollment.id} className={styles.mobileEnrollment}>
            <div className={styles.mobileStudentHeader}>
              <div className={styles.studentIdentity}>
                <strong>{enrollment.course?.code ?? "Course unavailable"}</strong>
                <span>{enrollment.course?.title ?? "Course details unavailable"}</span>
              </div>
              <span className={`${styles.statusBadge} ${styles[`enrollment${enrollment.status}`]}`}>
                {enrollmentStatusLabels[enrollment.status]}
              </span>
            </div>
            <dl className={styles.mobileFacts}>
              <div><dt>Offering</dt><dd>{enrollment.offering?.section ?? "Unavailable"}</dd></div>
              <div><dt>Academic term</dt><dd>{enrollment.academicTerm?.academicYear?.name ?? "Unavailable"} · {labelSemester(enrollment.academicTerm?.semester)}</dd></div>
              <div><dt>Instructor</dt><dd>{enrollment.instructor?.firstName && enrollment.instructor.lastName ? `${enrollment.instructor.firstName} ${enrollment.instructor.lastName}` : "Unavailable"}</dd></div>
              <div><dt>Enrolled</dt><dd>{formatDate(enrollment.enrolledAt)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminStudentRecord({
  studentId,
  profile,
  standings,
  enrollments,
}: Readonly<{
  studentId: string;
  profile: LoadResult<StudentProfile>;
  standings: LoadResult<readonly AcademicStanding[]>;
  enrollments: LoadResult<readonly StudentEnrollment[]>;
}>) {
  const title = profile.data ? fullName(profile.data.user) : "Student record";

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/admin/student-records">
        <ArrowLeft size={16} aria-hidden="true" />
        Student directory
      </Link>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>STUDENT ACADEMIC RECORD</p>
          <h1>{title}</h1>
          <p className={styles.description}>
            {profile.data?.studentNumber ?? `Student reference ${studentId}`}
          </p>
        </div>
      </header>

      <section className={styles.recordSection} aria-labelledby="profile-heading">
        <SectionHeader
          headingId="profile-heading"
          eyebrow="PROFILE"
          title="Student profile"
        />
        {profile.error ? (
          <ErrorPanel title="Student profile could not be loaded" message={profile.error} />
        ) : profile.data ? (
          <ProfileDetails profile={profile.data} />
        ) : null}
      </section>

      <section className={styles.recordSection} aria-labelledby="standing-heading">
        <SectionHeader
          headingId="standing-heading"
          eyebrow="ACADEMIC HISTORY"
          title="Academic standings"
          count={standings.data?.length}
        />
        {standings.error ? (
          <ErrorPanel title="Academic standings could not be loaded" message={standings.error} />
        ) : standings.data ? (
          <StandingHistory standings={standings.data} />
        ) : null}
      </section>

      <section className={styles.recordSection} aria-labelledby="enrollment-heading">
        <SectionHeader
          headingId="enrollment-heading"
          eyebrow="COURSE REGISTRATION"
          title="Course enrollments"
          count={enrollments.data?.length}
        />
        {enrollments.error ? (
          <ErrorPanel title="Course enrollments could not be loaded" message={enrollments.error} />
        ) : enrollments.data ? (
          <EnrollmentList enrollments={enrollments.data} />
        ) : null}
      </section>
    </main>
  );
}