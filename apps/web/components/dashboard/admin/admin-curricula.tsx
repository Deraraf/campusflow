"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Search, Trash2, X } from "lucide-react";
import styles from "./admin-curricula.module.css";

export type CurriculumCollege = Readonly<{
  id: string;
  name: string;
  code: string;
}>;
export type CurriculumDepartment = Readonly<{
  id: string;
  name: string;
  code: string;
  collegeId: string;
  college: CurriculumCollege;
}>;
export type CurriculumProgram = Readonly<{
  id: string;
  name: string;
  code: string;
  departmentId: string;
  durationYears: number;
  department: Readonly<{ id: string; name: string; code: string }>;
}>;
export type CatalogCourse = Readonly<{
  id: string;
  code: string;
  title: string;
  description: string | null;
}>;
export type CurriculumPlacement = Readonly<{
  id: string;
  programId: string;
  courseId: string;
  year: number;
  semester: "FIRST" | "SECOND" | "SUMMER";
  credits: number;
  courseType: "CORE" | "ELECTIVE" | "GENERAL";
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
  course: Readonly<{ id: string; code: string; title: string }>;
}>;

type InitialData = Readonly<{
  colleges: unknown;
  departments: unknown;
  programs: unknown;
  courses: unknown;
}>;
type Resource = keyof InitialData;
type InitialErrors = Record<Resource, string | null>;
type PlacementForm = {
  id?: string;
  courseId: string;
  year: number;
  semester: CurriculumPlacement["semester"];
  credits: number;
  courseType: CurriculumPlacement["courseType"];
  isRequired: boolean;
};
type DeleteTarget = Readonly<{
  id: string;
  courseCode: string;
  courseTitle: string;
}>;

const semesters: readonly CurriculumPlacement["semester"][] = [
  "FIRST",
  "SECOND",
  "SUMMER",
];
const semesterLabels: Record<CurriculumPlacement["semester"], string> = {
  FIRST: "First semester",
  SECOND: "Second semester",
  SUMMER: "Summer term",
};
const courseTypes: readonly CurriculumPlacement["courseType"][] = [
  "CORE",
  "ELECTIVE",
  "GENERAL",
];
const courseTypeLabels: Record<CurriculumPlacement["courseType"], string> = {
  CORE: "Core",
  ELECTIVE: "Elective",
  GENERAL: "General",
};
const semesterOrder: Record<CurriculumPlacement["semester"], number> = {
  FIRST: 0,
  SECOND: 1,
  SUMMER: 2,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isCollege(value: unknown): value is CurriculumCollege {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.code === "string"
  );
}
function isDepartment(value: unknown): value is CurriculumDepartment {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    typeof value.collegeId === "string" &&
    isCollege(value.college)
  );
}
function isProgram(value: unknown): value is CurriculumProgram {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    typeof value.departmentId === "string" &&
    typeof value.durationYears === "number" &&
    isRecord(value.department) &&
    typeof value.department.id === "string" &&
    typeof value.department.name === "string" &&
    typeof value.department.code === "string"
  );
}
function isCourse(value: unknown): value is CatalogCourse {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.title === "string" &&
    (typeof value.description === "string" || value.description === null)
  );
}
function isPlacement(value: unknown): value is CurriculumPlacement {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.programId === "string" &&
    typeof value.courseId === "string" &&
    typeof value.year === "number" &&
    semesters.includes(value.semester as CurriculumPlacement["semester"]) &&
    typeof value.credits === "number" &&
    courseTypes.includes(
      value.courseType as CurriculumPlacement["courseType"],
    ) &&
    typeof value.isRequired === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isRecord(value.course) &&
    typeof value.course.id === "string" &&
    typeof value.course.code === "string" &&
    typeof value.course.title === "string"
  );
}
function errorText(value: unknown) {
  return value instanceof Error
    ? value.message
    : "Request failed. Please try again.";
}
async function apiError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && "message" in body) {
      if (typeof body.message === "string") return body.message;
      if (Array.isArray(body.message))
        return body.message
          .filter((item): item is string => typeof item === "string")
          .join(" ");
    }
  } catch {
    // Use a status-based message for non-JSON responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

export default function AdminCurricula({
  initialData,
  initialErrors,
}: Readonly<{ initialData: InitialData; initialErrors: InitialErrors }>) {
  const [colleges, setColleges] = useState<readonly CurriculumCollege[] | null>(
    Array.isArray(initialData.colleges) && initialData.colleges.every(isCollege)
      ? initialData.colleges
      : null,
  );
  const [departments, setDepartments] = useState<
    readonly CurriculumDepartment[] | null
  >(
    Array.isArray(initialData.departments) &&
      initialData.departments.every(isDepartment)
      ? initialData.departments
      : null,
  );
  const [programs, setPrograms] = useState<readonly CurriculumProgram[] | null>(
    Array.isArray(initialData.programs) && initialData.programs.every(isProgram)
      ? initialData.programs
      : null,
  );
  const [courses, setCourses] = useState<readonly CatalogCourse[] | null>(
    Array.isArray(initialData.courses) && initialData.courses.every(isCourse)
      ? initialData.courses
      : null,
  );
  const [errors, setErrors] = useState<InitialErrors>({
    colleges:
      initialErrors.colleges ??
      (colleges === null ? "College data has an unexpected format." : null),
    departments:
      initialErrors.departments ??
      (departments === null
        ? "Department data has an unexpected format."
        : null),
    programs:
      initialErrors.programs ??
      (programs === null ? "Program data has an unexpected format." : null),
    courses:
      initialErrors.courses ??
      (courses === null ? "Course data has an unexpected format." : null),
  });
  const [collegeId, setCollegeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [curriculum, setCurriculum] = useState<
    readonly CurriculumPlacement[] | null
  >(null);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [form, setForm] = useState<PlacementForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const departmentsForCollege = (departments ?? []).filter(
    (department) => department.collegeId === collegeId,
  );
  const programsForDepartment = (programs ?? []).filter(
    (program) => program.departmentId === departmentId,
  );
  const selectedProgram =
    programsForDepartment.find((program) => program.id === programId) ?? null;

  useEffect(() => {
    let active = true;
    if (!programId) {
      setCurriculum(null);
      setCurriculumLoading(false);
      setCurriculumError(null);
      return;
    }
    setCurriculum(null);
    setCurriculumError(null);
    setCurriculumLoading(true);
    fetch(`/api/admin/programs/${encodeURIComponent(programId)}/curriculum`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await apiError(response));
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isPlacement))
          throw new Error("Curriculum data has an unexpected format.");
        if (active) setCurriculum(data);
      })
      .catch((error: unknown) => {
        if (active) setCurriculumError(errorText(error));
      })
      .finally(() => {
        if (active) setCurriculumLoading(false);
      });
    return () => {
      active = false;
    };
  }, [programId, reloadKey]);

  async function reloadResource(resource: Resource) {
    const paths: Record<Resource, string> = {
      colleges: "/api/admin/academic-structure/colleges",
      departments: "/api/admin/academic-structure/departments",
      programs: "/api/admin/academic-structure/programs",
      courses: "/api/admin/courses",
    };
    const validators = {
      colleges: isCollege,
      departments: isDepartment,
      programs: isProgram,
      courses: isCourse,
    };
    try {
      const response = await fetch(paths[resource], {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(validators[resource]))
        throw new Error(`${resource} data has an unexpected format.`);
      setErrors((current) => ({ ...current, [resource]: null }));
      if (resource === "colleges") setColleges(data as CurriculumCollege[]);
      if (resource === "departments")
        setDepartments(data as CurriculumDepartment[]);
      if (resource === "programs") setPrograms(data as CurriculumProgram[]);
      if (resource === "courses") setCourses(data as CatalogCourse[]);
    } catch (error) {
      setErrors((current) => ({ ...current, [resource]: errorText(error) }));
    }
  }

  async function reloadCurriculum() {
    if (!programId) return;
    setCurriculumLoading(true);
    setCurriculumError(null);
    try {
      const response = await fetch(
        `/api/admin/programs/${encodeURIComponent(programId)}/curriculum`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isPlacement))
        throw new Error("Curriculum data has an unexpected format.");
      setCurriculum(data);
    } catch (error) {
      setCurriculumError(errorText(error));
    } finally {
      setCurriculumLoading(false);
    }
  }

  function changeCollege(nextCollegeId: string) {
    setCollegeId(nextCollegeId);
    setDepartmentId("");
    setProgramId("");
    setSearch("");
  }
  function changeDepartment(nextDepartmentId: string) {
    setDepartmentId(nextDepartmentId);
    setProgramId("");
    setSearch("");
  }
  function changeProgram(nextProgramId: string) {
    setProgramId(nextProgramId);
    setSearch("");
    setNotice(null);
  }

  function openCreate() {
    setNotice(null);
    setFormError(null);
    setForm({
      courseId: "",
      year: 1,
      semester: "FIRST",
      credits: 1,
      courseType: "CORE",
      isRequired: true,
    });
  }
  function openEdit(placement: CurriculumPlacement) {
    setNotice(null);
    setFormError(null);
    setForm({
      id: placement.id,
      courseId: placement.courseId,
      year: placement.year,
      semester: placement.semester,
      credits: placement.credits,
      courseType: placement.courseType,
      isRequired: placement.isRequired,
    });
  }

  async function submitPlacement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !selectedProgram || formPending) return;
    if (
      !Number.isInteger(form.year) ||
      form.year < 1 ||
      form.year > selectedProgram.durationYears
    ) {
      setFormError(
        `Year level must be a whole number from 1 to ${selectedProgram.durationYears}.`,
      );
      return;
    }
    if (!Number.isInteger(form.credits) || form.credits < 1) {
      setFormError("Credits must be a positive whole number.");
      return;
    }
    if (!form.id && !form.courseId) {
      setFormError("Select a catalog course.");
      return;
    }
    if (
      !form.id &&
      curriculum?.some((placement) => placement.courseId === form.courseId)
    ) {
      setFormError(
        "This Course is already assigned to the selected Program curriculum.",
      );
      return;
    }

    setFormPending(true);
    setFormError(null);
    try {
      const body = {
        year: form.year,
        semester: form.semester,
        credits: form.credits,
        courseType: form.courseType,
        isRequired: form.isRequired,
      };
      const url = form.id
        ? `/api/admin/programs/${encodeURIComponent(programId)}/curriculum/${encodeURIComponent(form.id)}`
        : `/api/admin/programs/${encodeURIComponent(programId)}/curriculum`;
      const response = await fetch(url, {
        method: form.id ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          form.id ? body : { courseId: form.courseId, ...body },
        ),
      });
      if (!response.ok) throw new Error(await apiError(response));
      setForm(null);
      setNotice(
        form.id
          ? "Curriculum placement updated."
          : "Course added to the Program curriculum.",
      );
      await reloadCurriculum();
    } catch (error) {
      setFormError(errorText(error));
    } finally {
      setFormPending(false);
    }
  }

  async function removePlacement() {
    if (!deleteTarget || !programId || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const response = await fetch(
        `/api/admin/programs/${encodeURIComponent(programId)}/curriculum/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      setDeleteTarget(null);
      setNotice(
        `${deleteTarget.courseCode} removed from this curriculum. The Course Catalog record is unchanged.`,
      );
      await reloadCurriculum();
    } catch (error) {
      setDeleteError(errorText(error));
    } finally {
      setDeletePending(false);
    }
  }

  const visiblePlacements: CurriculumPlacement[] = [...(curriculum ?? [])]
    .filter((placement) => {
      const haystack =
        `${placement.course.code} ${placement.course.title}`.toLocaleLowerCase();
      return (
        haystack.includes(search.trim().toLocaleLowerCase()) &&
        (yearFilter === "ALL" || placement.year === Number(yearFilter)) &&
        (semesterFilter === "ALL" || placement.semester === semesterFilter) &&
        (typeFilter === "ALL" || placement.courseType === typeFilter)
      );
    })
    .sort(
      (left, right) =>
        left.year - right.year ||
        ["FIRST", "SECOND", "SUMMER"].indexOf(left.semester) -
          ["FIRST", "SECOND", "SUMMER"].indexOf(right.semester) ||
        left.course.code.localeCompare(right.course.code),
    );

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Curriculum management</h1>
          <p className={styles.description}>
            Plan a Program’s course placements by year and semester. Curriculum
            placements are separate from course offerings.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={!selectedProgram || !courses?.length}
          onClick={openCreate}
        >
          <Plus size={16} aria-hidden="true" /> Add course
        </button>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      <div className={styles.selectorBar}>
        <label className={styles.selector}>
          <span>College</span>
          <select
            value={collegeId}
            disabled={!colleges?.length}
            onChange={(event) => changeCollege(event.target.value)}
          >
            <option value="">Select College</option>
            {colleges?.map((college) => (
              <option key={college.id} value={college.id}>
                {college.name} ({college.code})
              </option>
            ))}
          </select>
        </label>
        <label className={styles.selector}>
          <span>Department</span>
          <select
            value={departmentId}
            disabled={!collegeId || !departments?.length}
            onChange={(event) => changeDepartment(event.target.value)}
          >
            <option value="">Select Department</option>
            {departmentsForCollege.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name} ({department.code})
              </option>
            ))}
          </select>
        </label>
        <label className={styles.selector}>
          <span>Program</span>
          <select
            value={programId}
            disabled={!departmentId || !programs?.length}
            onChange={(event) => changeProgram(event.target.value)}
          >
            <option value="">Select Program</option>
            {programsForDepartment.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.code})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.optionErrors}>
        {(["colleges", "departments", "programs", "courses"] as const).map(
          (resource) =>
            errors[resource] ? (
              <div className={styles.errorBanner} role="alert" key={resource}>
                <p>
                  {resource[0]?.toUpperCase()}
                  {resource.slice(1)} unavailable: {errors[resource]}
                </p>
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => void reloadResource(resource)}
                >
                  Retry
                </button>
              </div>
            ) : null,
        )}
      </div>

      {programs === null ? (
        errors.programs ? null : (
          <div className={styles.loadingSkeleton} aria-busy="true">
            <span />
            <span />
            <span />
          </div>
        )
      ) : programs.length === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen size={22} aria-hidden="true" />
          <h2>No Programs available</h2>
          <p>
            Create a Program in Academic Structure before managing curriculum
            placements.
          </p>
        </div>
      ) : !collegeId ? (
        <div className={styles.emptyState}>
          <BookOpen size={22} aria-hidden="true" />
          <p>
            Select a College, Department, and Program to view its curriculum.
          </p>
        </div>
      ) : !departmentId ? (
        <div className={styles.emptyState}>
          <BookOpen size={22} aria-hidden="true" />
          <p>Select a Department within the selected College.</p>
        </div>
      ) : !selectedProgram ? (
        <div className={styles.emptyState}>
          <BookOpen size={22} aria-hidden="true" />
          <p>Select a Program to view its curriculum placements.</p>
        </div>
      ) : (
        <section
          className={styles.curriculumSection}
          aria-labelledby="curriculum-heading"
        >
          <header className={styles.programHeader}>
            <div>
              <p className={styles.parentPath}>
                {colleges?.find((college) => college.id === collegeId)?.name} /{" "}
                {selectedProgram.department.name}
              </p>
              <h2 id="curriculum-heading">
                {selectedProgram.name}{" "}
                <span className={styles.code}>{selectedProgram.code}</span>
              </h2>
              <p className={styles.programMeta}>
                Duration: {selectedProgram.durationYears}{" "}
                {selectedProgram.durationYears === 1 ? "year" : "years"}
              </p>
            </div>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={!courses?.length}
              onClick={openCreate}
            >
              <Plus size={15} aria-hidden="true" /> Add course placement
            </button>
          </header>

          {courses === null && errors.courses ? (
            <div className={styles.optionWarning} role="status">
              Catalog course options could not be loaded. Existing curriculum
              remains visible; retry Courses above to add a placement.
            </div>
          ) : null}
          {curriculumLoading ? (
            <div className={styles.loadingSkeleton} aria-busy="true">
              <span />
              <span />
              <span />
            </div>
          ) : curriculumError ? (
            <div className={styles.errorBanner} role="alert">
              <p>{curriculumError}</p>
              <button
                className={styles.textButton}
                type="button"
                onClick={() => void reloadCurriculum()}
              >
                Retry curriculum
              </button>
            </div>
          ) : curriculum === null ? null : curriculum.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={20} aria-hidden="true" />
              <h3>No curriculum placements</h3>
              <p>This Program has no planned courses yet.</p>
              {courses?.length ? (
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={openCreate}
                >
                  <Plus size={15} aria-hidden="true" /> Add the first course
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className={styles.toolbar}>
                <label className={styles.searchField}>
                  <Search size={16} aria-hidden="true" />
                  <span className={styles.visuallyHidden}>
                    Search curriculum courses
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search course code or title"
                  />
                </label>
                <label className={styles.filterField}>
                  <span>Year</span>
                  <select
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                  >
                    <option value="ALL">All years</option>
                    {Array.from(
                      { length: selectedProgram.durationYears },
                      (_, index) => index + 1,
                    ).map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.filterField}>
                  <span>Semester</span>
                  <select
                    value={semesterFilter}
                    onChange={(event) => setSemesterFilter(event.target.value)}
                  >
                    <option value="ALL">All semesters</option>
                    {semesters.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.filterField}>
                  <span>Classification</span>
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                  >
                    <option value="ALL">All types</option>
                    {courseTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.resultCount} aria-live="polite">
                  {visiblePlacements.length} of {curriculum.length} placements
                </p>
              </div>

              {visiblePlacements.length === 0 ? (
                <div className={styles.emptyState}>
                  <Search size={19} aria-hidden="true" />
                  <h3>No matching placements</h3>
                  <p>Try adjusting the search or curriculum filters.</p>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.curriculumTable}>
                    <caption className={styles.visuallyHidden}>
                      {selectedProgram.name} curriculum
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Year</th>
                        <th scope="col">Semester</th>
                        <th scope="col">Course</th>
                        <th scope="col">Credits</th>
                        <th scope="col">Type</th>
                        <th scope="col">Requirement</th>
                        <th scope="col">
                          <span className={styles.visuallyHidden}>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePlacements.map((placement) => (
                        <tr key={placement.id}>
                          <td>Year {placement.year}</td>
                          <td>{semesterLabels[placement.semester]}</td>
                          <td>
                            <div className={styles.courseCell}>
                              <strong>{placement.course.title}</strong>
                              <span>{placement.course.code}</span>
                            </div>
                          </td>
                          <td>{placement.credits}</td>
                          <td>
                            <span className={styles.typeBadge}>
                              {courseTypeLabels[placement.courseType]}
                            </span>
                          </td>
                          <td>
                            {placement.isRequired ? "Required" : "Optional"}
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                className={styles.textButton}
                                type="button"
                                onClick={() => openEdit(placement)}
                              >
                                Edit placement
                              </button>
                              <button
                                className={styles.iconAction}
                                type="button"
                                aria-label={`Remove ${placement.course.code} placement`}
                                title="Remove placement"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: placement.id,
                                    courseCode: placement.course.code,
                                    courseTitle: placement.course.title,
                                  })
                                }
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ul
                    className={styles.mobilePlacements}
                    aria-label="Curriculum placements"
                  >
                    {visiblePlacements.map((placement) => (
                      <li className={styles.mobilePlacement} key={placement.id}>
                        <div className={styles.courseCell}>
                          <strong>{placement.course.title}</strong>
                          <span>{placement.course.code}</span>
                        </div>
                        <dl>
                          <Fact label="Year" value={`Year ${placement.year}`} />
                          <Fact
                            label="Semester"
                            value={semesterLabels[placement.semester]}
                          />
                          <Fact
                            label="Credits"
                            value={String(placement.credits)}
                          />
                          <Fact
                            label="Type"
                            value={courseTypeLabels[placement.courseType]}
                          />
                          <Fact
                            label="Requirement"
                            value={
                              placement.isRequired ? "Required" : "Optional"
                            }
                          />
                        </dl>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.textButton}
                            type="button"
                            onClick={() => openEdit(placement)}
                          >
                            Edit placement
                          </button>
                          <button
                            className={styles.textButton}
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                id: placement.id,
                                courseCode: placement.course.code,
                                courseTitle: placement.course.title,
                              })
                            }
                          >
                            Remove placement
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {form && selectedProgram ? (
        <PlacementFormDialog
          form={form}
          courses={courses}
          program={selectedProgram}
          existing={curriculum ?? []}
          pending={formPending}
          error={formError}
          onChange={setForm}
          onClose={() => setForm(null)}
          onSubmit={submitPlacement}
        />
      ) : null}

      {deleteTarget ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletePending)
              setDeleteTarget(null);
          }}
        >
          <section
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="placement-delete-title"
            aria-describedby="placement-delete-copy"
          >
            <header className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>CURRICULUM PLACEMENT</p>
                <h2 id="placement-delete-title">Remove course placement?</h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Close dialog"
                disabled={deletePending}
                onClick={() => setDeleteTarget(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <p className={styles.dialogCopy} id="placement-delete-copy">
              Remove {deleteTarget.courseCode} · {deleteTarget.courseTitle} from
              this Program curriculum? This removes only the placement; the
              Course Catalog record remains unchanged.
            </p>
            {deleteError ? (
              <p className={styles.formError} role="alert">
                {deleteError}
              </p>
            ) : null}
            <div className={styles.dialogActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={deletePending}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                disabled={deletePending}
                onClick={() => void removePlacement()}
              >
                {deletePending ? "Removing..." : "Confirm removal"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function PlacementFormDialog({
  form,
  courses,
  program,
  existing,
  pending,
  error,
  onChange,
  onClose,
  onSubmit,
}: Readonly<{
  form: PlacementForm;
  courses: readonly CatalogCourse[] | null;
  program: CurriculumProgram;
  existing: readonly CurriculumPlacement[];
  pending: boolean;
  error: string | null;
  onChange: (form: PlacementForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}>) {
  const duplicate = courses?.find(
    (course) =>
      course.id === form.courseId &&
      existing.some(
        (placement) =>
          placement.courseId === course.id && placement.id !== form.id,
      ),
  );
  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="placement-form-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) onClose();
        }}
      >
        <header className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>PROGRAM CURRICULUM</p>
            <h2 id="placement-form-title">
              {form.id ? "Edit placement" : "Add course placement"}
            </h2>
            <p className={styles.dialogSubtitle}>
              {program.name} · {program.code}
            </p>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="Close dialog"
            disabled={pending}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <form className={styles.form} onSubmit={onSubmit}>
          {form.id ? (
            <div className={styles.formSummary}>
              <span>Catalog course</span>
              <strong>
                {courses?.find((course) => course.id === form.courseId)?.code ??
                  "Course"}{" "}
                ·{" "}
                {courses?.find((course) => course.id === form.courseId)
                  ?.title ?? ""}
              </strong>
              <small>
                Editing a placement does not change the underlying Course.
              </small>
            </div>
          ) : (
            <label className={styles.formField}>
              <span>Catalog course</span>
              <select
                autoFocus
                required
                value={form.courseId}
                disabled={!courses?.length}
                onChange={(event) =>
                  onChange({ ...form, courseId: event.target.value })
                }
              >
                <option value="">Select a catalog Course</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={styles.formRow}>
            <label className={styles.formField}>
              <span>Program year (1–{program.durationYears})</span>
              <input
                required
                type="number"
                min={1}
                max={program.durationYears}
                step={1}
                value={form.year}
                onChange={(event) =>
                  onChange({ ...form, year: Number(event.target.value) })
                }
              />
            </label>
            <label className={styles.formField}>
              <span>Semester</span>
              <select
                value={form.semester}
                onChange={(event) =>
                  onChange({
                    ...form,
                    semester: event.target
                      .value as CurriculumPlacement["semester"],
                  })
                }
              >
                {semesters.map((semester) => (
                  <option key={semester} value={semester}>
                    {semesterLabels[semester]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.formRow}>
            <label className={styles.formField}>
              <span>Credits</span>
              <input
                required
                type="number"
                min={1}
                step={1}
                value={form.credits}
                onChange={(event) =>
                  onChange({ ...form, credits: Number(event.target.value) })
                }
              />
            </label>
            <label className={styles.formField}>
              <span>Course classification</span>
              <select
                value={form.courseType}
                onChange={(event) =>
                  onChange({
                    ...form,
                    courseType: event.target
                      .value as CurriculumPlacement["courseType"],
                  })
                }
              >
                {courseTypes.map((type) => (
                  <option key={type} value={type}>
                    {courseTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.checkField}>
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(event) =>
                onChange({ ...form, isRequired: event.target.checked })
              }
            />
            <span>Required in this Program curriculum</span>
          </label>
          {duplicate && !form.id ? (
            <p className={styles.formError} role="alert">
              This Course already has a placement in this Program.
            </p>
          ) : null}
          {courses === null && !form.id ? (
            <p className={styles.optionWarning}>
              Course catalog options are unavailable. Retry Courses before
              adding a placement.
            </p>
          ) : null}
          {error ? (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.dialogActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={
                pending ||
                (!form.id && (!courses?.length || Boolean(duplicate)))
              }
            >
              {pending
                ? "Saving..."
                : form.id
                  ? "Save placement"
                  : "Add to curriculum"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
