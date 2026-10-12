"use client";

import { useState } from "react";
import {
  Building2,
  GraduationCap,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import styles from "./admin-academic-structure.module.css";

type Resource = "colleges" | "departments" | "programs" | "instructors";
type Section = Exclude<Resource, "instructors">;
type InstructorRef = Readonly<{
  id: string;
  employeeNumber: string;
  user: Readonly<{ firstName: string; lastName: string }>;
}>;
type CollegeRef = Readonly<{ id: string; name: string; code: string }>;
type DepartmentRef = Readonly<{
  id: string;
  name: string;
  code: string;
  college?: CollegeRef | null;
}>;
type College = Readonly<{
  id: string;
  name: string;
  code: string;
  deanId: string | null;
  dean: InstructorRef | null;
  departments: unknown;
  createdAt: string;
  updatedAt: string;
}>;
type Department = Readonly<{
  id: string;
  name: string;
  code: string;
  collegeId: string;
  college: CollegeRef;
  headInstructorId: string | null;
  head: InstructorRef | null;
  programs: unknown;
  instructors: unknown;
  createdAt: string;
  updatedAt: string;
}>;
type Program = Readonly<{
  id: string;
  name: string;
  code: string;
  departmentId: string;
  durationYears: number;
  department: Omit<DepartmentRef, "college">;
  coordinatorInstructorId: string | null;
  coordinator: InstructorRef | null;
  curriculumCourses: unknown;
  students: unknown;
  createdAt: string;
  updatedAt: string;
}>;
type Instructor = Readonly<{
  id: string;
  departmentId: string;
  employeeNumber: string;
  user: Readonly<{ firstName: string; lastName: string }>;
  department?: DepartmentRef | null;
}>;

type StructureData = Record<Resource, unknown>;
type StructureErrors = Record<Resource, string | null>;

type CollegeForm = {
  kind: "colleges";
  id?: string;
  name: string;
  code: string;
  deanId: string | null;
};
type DepartmentForm = {
  kind: "departments";
  id?: string;
  name: string;
  code: string;
  collegeId: string;
  headInstructorId: string | null;
};
type ProgramForm = {
  kind: "programs";
  id?: string;
  name: string;
  code: string;
  departmentId: string;
  durationYears: number;
  coordinatorInstructorId: string | null;
  originalDepartmentId?: string;
  hadCoordinator?: boolean;
};
type FormState = CollegeForm | DepartmentForm | ProgramForm;
type DeleteTarget = Readonly<{
  resource: Section;
  id: string;
  label: string;
  dependencyNote: string;
}>;

const sectionLabels: Record<Section, string> = {
  colleges: "Colleges",
  departments: "Departments",
  programs: "Programs",
};
const sectionIcons = {
  colleges: Building2,
  departments: Network,
  programs: GraduationCap,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInstructorRef(value: unknown): value is InstructorRef {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.employeeNumber === "string" &&
    isRecord(value.user) &&
    typeof value.user.firstName === "string" &&
    typeof value.user.lastName === "string"
  );
}

function isCollegeRef(value: unknown): value is CollegeRef {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.code === "string"
  );
}

function isCollege(value: unknown): value is College {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    (value.deanId === null || typeof value.deanId === "string") &&
    (value.dean === null || isInstructorRef(value.dean)) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isDepartment(value: unknown): value is Department {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    typeof value.collegeId === "string" &&
    isCollegeRef(value.college) &&
    (value.headInstructorId === null ||
      typeof value.headInstructorId === "string") &&
    (value.head === null || isInstructorRef(value.head)) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isProgram(value: unknown): value is Program {
  if (!isRecord(value) || !isRecord(value.department)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    typeof value.departmentId === "string" &&
    typeof value.durationYears === "number" &&
    (value.coordinatorInstructorId === null ||
      typeof value.coordinatorInstructorId === "string") &&
    typeof value.department.id === "string" &&
    typeof value.department.name === "string" &&
    typeof value.department.code === "string" &&
    (value.coordinator === null || isInstructorRef(value.coordinator)) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isInstructor(value: unknown): value is Instructor {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.departmentId === "string" &&
    typeof value.employeeNumber === "string" &&
    isRecord(value.user) &&
    typeof value.user.firstName === "string" &&
    typeof value.user.lastName === "string" &&
    (value.department === undefined ||
      value.department === null ||
      isRecord(value.department))
  );
}

function parseList<T>(value: unknown, guard: (row: unknown) => row is T) {
  return Array.isArray(value) && value.every(guard)
    ? (value as readonly T[])
    : null;
}

function countValue(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : null;
}

function instructorName(instructor: InstructorRef | null | undefined) {
  if (!instructor) return "Not assigned";
  const name = [instructor.user.firstName, instructor.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name
    ? `${name} · ${instructor.employeeNumber}`
    : instructor.employeeNumber;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

async function apiError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && "message" in body) {
      if (typeof body.message === "string") return body.message;
      if (Array.isArray(body.message)) {
        return body.message
          .filter((item): item is string => typeof item === "string")
          .join(" ");
      }
    }
  } catch {
    // Use a status-based message for non-JSON responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

const guards = {
  colleges: isCollege,
  departments: isDepartment,
  programs: isProgram,
  instructors: isInstructor,
};

export default function AdminAcademicStructure({
  initialData,
  initialErrors,
}: Readonly<{
  initialData: StructureData;
  initialErrors: StructureErrors;
}>) {
  const [section, setSection] = useState<Section>("colleges");
  const [colleges, setColleges] = useState(
    parseList(initialData.colleges, isCollege),
  );
  const [departments, setDepartments] = useState(
    parseList(initialData.departments, isDepartment),
  );
  const [programs, setPrograms] = useState(
    parseList(initialData.programs, isProgram),
  );
  const [instructors, setInstructors] = useState(
    parseList(initialData.instructors, isInstructor),
  );
  const [errors, setErrors] = useState<StructureErrors>({
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
    instructors:
      initialErrors.instructors ??
      (instructors === null
        ? "Instructor option data has an unexpected format."
        : null),
  });
  const [search, setSearch] = useState("");
  const [departmentCollegeFilter, setDepartmentCollegeFilter] = useState("ALL");
  const [programCollegeFilter, setProgramCollegeFilter] = useState("ALL");
  const [programDepartmentFilter, setProgramDepartmentFilter] = useState("ALL");
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload(resource: Resource) {
    try {
      const response = await fetch(
        `/api/admin/academic-structure/${resource}`,
        {
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(guards[resource])) {
        throw new Error(
          `${sectionLabels[resource as Section] ?? "Instructor"} data has an unexpected format.`,
        );
      }
      setErrors((current) => ({ ...current, [resource]: null }));
      if (resource === "colleges") setColleges(data as College[]);
      if (resource === "departments") setDepartments(data as Department[]);
      if (resource === "programs") setPrograms(data as Program[]);
      if (resource === "instructors") setInstructors(data as Instructor[]);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [resource]:
          error instanceof Error
            ? error.message
            : "The resource could not be refreshed.",
      }));
      if (resource === "departments") {
        setProgramCollegeFilter("ALL");
        setProgramDepartmentFilter("ALL");
      }
    }
  }

  async function reloadRelated(resource: Section) {
    const related: Record<Section, readonly Resource[]> = {
      colleges: ["colleges", "departments"],
      departments: ["departments", "colleges", "programs"],
      programs: ["programs", "departments"],
    };
    await Promise.all(related[resource].map((item) => reload(item)));
  }

  function openCreate(resource: Section) {
    setNotice(null);
    setFormError(null);
    if (resource === "colleges") {
      setForm({ kind: "colleges", name: "", code: "", deanId: null });
    } else if (resource === "departments") {
      setForm({
        kind: "departments",
        name: "",
        code: "",
        collegeId: colleges?.[0]?.id ?? "",
        headInstructorId: null,
      });
    } else {
      const firstDepartment = departments?.[0];
      setForm({
        kind: "programs",
        name: "",
        code: "",
        departmentId: firstDepartment?.id ?? "",
        durationYears: 1,
        coordinatorInstructorId: null,
      });
    }
  }

  function openEdit(record: College | Department | Program) {
    setFormError(null);
    if ("deanId" in record) {
      setForm({
        kind: "colleges",
        id: record.id,
        name: record.name,
        code: record.code,
        deanId: record.deanId,
      });
    } else if ("collegeId" in record) {
      setForm({
        kind: "departments",
        id: record.id,
        name: record.name,
        code: record.code,
        collegeId: record.collegeId,
        headInstructorId: record.headInstructorId,
      });
    } else {
      setForm({
        kind: "programs",
        id: record.id,
        name: record.name,
        code: record.code,
        departmentId: record.departmentId,
        durationYears: record.durationYears,
        coordinatorInstructorId: record.coordinatorInstructorId,
        originalDepartmentId: record.departmentId,
        hadCoordinator: record.coordinatorInstructorId !== null,
      });
    }
  }

  async function saveForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || formPending) return;
    setFormError(null);

    const name = form.name.trim();
    const code = form.code.trim();
    if (!name) {
      setFormError("Enter a name.");
      return;
    }
    if (!code) {
      setFormError("Enter a code.");
      return;
    }
    if (form.kind === "departments" && !form.collegeId) {
      setFormError("Select a parent college.");
      return;
    }
    if (form.kind === "programs") {
      if (!form.departmentId) {
        setFormError("Select a parent department.");
        return;
      }
      if (
        !Number.isInteger(form.durationYears) ||
        form.durationYears < 1 ||
        form.durationYears > 10
      ) {
        setFormError("Duration must be a whole number from 1 to 10 years.");
        return;
      }
      if (form.coordinatorInstructorId) {
        const coordinator = instructors?.find(
          (item) => item.id === form.coordinatorInstructorId,
        );
        if (!coordinator || coordinator.departmentId !== form.departmentId) {
          setFormError(
            "The Program Coordinator must belong to the selected Department.",
          );
          return;
        }
      }
    }
    if (form.kind === "departments" && form.headInstructorId) {
      const head = instructors?.find(
        (item) => item.id === form.headInstructorId,
      );
      if (!head || head.departmentId !== form.id) {
        setFormError("The Department Head must belong to this Department.");
        return;
      }
    }

    setFormPending(true);
    try {
      const creating = !form.id;
      const payload: Record<string, unknown> = { name, code };
      if (form.kind === "colleges") {
        if (instructors !== null) payload.deanId = form.deanId;
      } else if (form.kind === "departments") {
        payload.collegeId = form.collegeId;
        if (!creating && instructors !== null)
          payload.headInstructorId = form.headInstructorId;
      } else {
        payload.departmentId = form.departmentId;
        payload.durationYears = form.durationYears;
        if (!creating && instructors !== null)
          payload.coordinatorInstructorId = form.coordinatorInstructorId;
        if (
          !creating &&
          instructors === null &&
          form.hadCoordinator &&
          form.departmentId !== form.originalDepartmentId
        ) {
          payload.coordinatorInstructorId = null;
        }
      }

      const path = `/api/admin/academic-structure/${form.kind}${form.id ? `/${encodeURIComponent(form.id)}` : ""}`;
      const response = await fetch(path, {
        method: creating ? "POST" : "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await apiError(response));

      const resource = form.kind;
      const action = creating ? "created" : "updated";
      setForm(null);
      setNotice(`${sectionLabels[resource]} ${action}.`);
      await reloadRelated(resource);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The record could not be saved.",
      );
    } finally {
      setFormPending(false);
    }
  }

  async function removeRecord() {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const response = await fetch(
        `/api/admin/academic-structure/${deleteTarget.resource}/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const resource = deleteTarget.resource;
      setDeleteTarget(null);
      setNotice(`${sectionLabels[resource]} deleted.`);
      await reloadRelated(resource);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The record could not be deleted.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  const currentData =
    section === "colleges"
      ? colleges
      : section === "departments"
        ? departments
        : programs;
  const currentError = errors[section];
  const collegeById = new Map(
    (colleges ?? []).map((college) => [college.id, college]),
  );
  const departmentById = new Map(
    (departments ?? []).map((department) => [department.id, department]),
  );
  const needle = search.trim().toLocaleLowerCase();

  const visibleColleges = (colleges ?? []).filter((college) =>
    `${college.name} ${college.code}`.toLocaleLowerCase().includes(needle),
  );
  const visibleDepartments = (departments ?? []).filter((department) => {
    const matchesSearch =
      `${department.name} ${department.code} ${department.college.name} ${department.college.code}`
        .toLocaleLowerCase()
        .includes(needle);
    return (
      matchesSearch &&
      (departmentCollegeFilter === "ALL" ||
        department.collegeId === departmentCollegeFilter)
    );
  });
  const visiblePrograms = (programs ?? []).filter((program) => {
    const department = departmentById.get(program.departmentId);
    const collegeId = department?.collegeId;
    const college = department
      ? collegeById.get(department.collegeId)
      : undefined;
    const matchesSearch =
      `${program.name} ${program.code} ${program.department.name} ${program.department.code} ${college?.name ?? ""} ${college?.code ?? ""}`
        .toLocaleLowerCase()
        .includes(needle);
    return (
      matchesSearch &&
      (programCollegeFilter === "ALL" || collegeId === programCollegeFilter) &&
      (programDepartmentFilter === "ALL" ||
        program.departmentId === programDepartmentFilter)
    );
  });

  function selectSection(resource: Section) {
    setSection(resource);
    setSearch("");
    setNotice(null);
  }

  function renderLoadError(resource: Section) {
    const message = errors[resource];
    if (!message) return null;
    const hasData =
      resource === "colleges"
        ? colleges !== null
        : resource === "departments"
          ? departments !== null
          : programs !== null;
    return (
      <div className={styles.errorBanner} role="alert">
        <p>
          {hasData
            ? `Could not refresh ${sectionLabels[resource].toLocaleLowerCase()}; showing the last loaded data. ${message}`
            : message}
        </p>
        <button
          className={styles.textButton}
          type="button"
          onClick={() => void reload(resource)}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Academic structure</h1>
          <p className={styles.description}>
            Manage colleges, departments, and programs while preserving their
            parent relationships.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={
            section === "departments"
              ? !colleges?.length
              : section === "programs"
                ? !departments?.length
                : false
          }
          onClick={() => openCreate(section)}
        >
          <Plus size={16} aria-hidden="true" /> Add{" "}
          {section === "colleges"
            ? "college"
            : section === "departments"
              ? "department"
              : "program"}
        </button>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      <nav
        className={styles.sectionTabs}
        aria-label="Academic structure resources"
      >
        {(["colleges", "departments", "programs"] as const).map((item) => {
          const Icon = sectionIcons[item];
          const active = section === item;
          const records =
            item === "colleges"
              ? colleges
              : item === "departments"
                ? departments
                : programs;
          return (
            <button
              key={item}
              className={`${styles.sectionTab} ${active ? styles.sectionTabActive : ""}`}
              type="button"
              aria-pressed={active}
              onClick={() => selectSection(item)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{sectionLabels[item]}</span>
              <span className={styles.tabCount}>{records?.length ?? "—"}</span>
            </button>
          );
        })}
      </nav>

      <section
        className={styles.contentSection}
        aria-label={sectionLabels[section]}
      >
        {renderLoadError(section)}
        {section === "departments" && errors.colleges ? (
          <div className={styles.errorBanner} role="alert">
            <p>
              College options could not be loaded. Department assignments
              require a College. {errors.colleges}
            </p>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => void reload("colleges")}
            >
              Retry Colleges
            </button>
          </div>
        ) : null}
        {currentData === null ? (
          currentError ? null : (
            <div
              className={styles.loadingSkeleton}
              aria-busy="true"
              aria-label={`Loading ${sectionLabels[section].toLowerCase()}`}
            >
              <span />
              <span />
              <span />
            </div>
          )
        ) : (
          <>
            <div className={styles.toolbar}>
              <label className={styles.searchField}>
                <Search size={16} aria-hidden="true" />
                <span className={styles.visuallyHidden}>
                  Search {sectionLabels[section].toLowerCase()}
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${sectionLabels[section].toLowerCase()}`}
                />
              </label>
              {section === "departments" ? (
                <label className={styles.filterField}>
                  <span>College</span>
                  <select
                    value={departmentCollegeFilter}
                    onChange={(event) =>
                      setDepartmentCollegeFilter(event.target.value)
                    }
                  >
                    <option value="ALL">All colleges</option>
                    {(colleges ?? []).map((college) => (
                      <option key={college.id} value={college.id}>
                        {college.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {section === "programs" ? (
                <>
                  <label className={styles.filterField}>
                    <span>College</span>
                    <select
                      disabled={departments === null}
                      value={programCollegeFilter}
                      onChange={(event) => {
                        setProgramCollegeFilter(event.target.value);
                        setProgramDepartmentFilter("ALL");
                      }}
                    >
                      <option value="ALL">All colleges</option>
                      {(colleges ?? []).map((college) => (
                        <option key={college.id} value={college.id}>
                          {college.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.filterField}>
                    <span>Department</span>
                    <select
                      disabled={departments === null}
                      value={programDepartmentFilter}
                      onChange={(event) =>
                        setProgramDepartmentFilter(event.target.value)
                      }
                    >
                      <option value="ALL">All departments</option>
                      {(departments ?? [])
                        .filter(
                          (department) =>
                            programCollegeFilter === "ALL" ||
                            department.collegeId === programCollegeFilter,
                        )
                        .map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              ) : null}
              {section === "programs" && errors.departments ? (
                <div className={styles.optionWarning} role="alert">
                  College and department filters are unavailable:{" "}
                  {errors.departments}
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => void reload("departments")}
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              <p className={styles.resultCount} aria-live="polite">
                {section === "colleges"
                  ? visibleColleges.length
                  : section === "departments"
                    ? visibleDepartments.length
                    : visiblePrograms.length}{" "}
                of {currentData.length} records
              </p>
            </div>

            {currentData.length === 0 ? (
              <EmptyState
                resource={section}
                onCreate={() => openCreate(section)}
                canCreate={
                  section === "colleges" ||
                  (section === "departments"
                    ? Boolean(colleges?.length)
                    : Boolean(departments?.length))
                }
              />
            ) : (section === "colleges" && visibleColleges.length === 0) ||
              (section === "departments" && visibleDepartments.length === 0) ||
              (section === "programs" && visiblePrograms.length === 0) ? (
              <div className={styles.emptyState}>
                <Search size={20} aria-hidden="true" />
                <h2>No matching records</h2>
                <p>Try changing the search or parent filters.</p>
              </div>
            ) : (
              <div className={styles.recordList}>
                {section === "colleges"
                  ? visibleColleges.map((college) => (
                      <article className={styles.record} key={college.id}>
                        <div className={styles.recordMain}>
                          <div className={styles.recordHeading}>
                            <h2>{college.name}</h2>
                            <span className={styles.code}>{college.code}</span>
                          </div>
                          <dl className={styles.recordFacts}>
                            <Fact
                              label="Dean"
                              value={instructorName(college.dean)}
                            />
                            {countValue(college.departments) !== null ? (
                              <Fact
                                label="Departments"
                                value={countValue(college.departments)!}
                              />
                            ) : null}
                            <Fact
                              label="Created"
                              value={formatDate(college.createdAt)}
                            />
                          </dl>
                        </div>
                        <RecordActions
                          label={`${college.name} College`}
                          onEdit={() => openEdit(college)}
                          onDelete={() => {
                            setDeleteError(null);
                            setDeleteTarget({
                              resource: "colleges",
                              id: college.id,
                              label: `${college.name} (${college.code})`,
                              dependencyNote:
                                "Colleges with departments cannot be deleted.",
                            });
                          }}
                        />
                      </article>
                    ))
                  : null}
                {section === "departments"
                  ? visibleDepartments.map((department) => (
                      <article className={styles.record} key={department.id}>
                        <div className={styles.recordMain}>
                          <div className={styles.recordHeading}>
                            <h2>{department.name}</h2>
                            <span className={styles.code}>
                              {department.code}
                            </span>
                          </div>
                          <p className={styles.parentPath}>
                            {department.college.name} <span>/</span>{" "}
                            {department.college.code}
                          </p>
                          <dl className={styles.recordFacts}>
                            <Fact
                              label="Department Head"
                              value={instructorName(department.head)}
                            />
                            {countValue(department.programs) !== null ? (
                              <Fact
                                label="Programs"
                                value={countValue(department.programs)!}
                              />
                            ) : null}
                            {countValue(department.instructors) !== null ? (
                              <Fact
                                label="Instructors"
                                value={countValue(department.instructors)!}
                              />
                            ) : null}
                          </dl>
                        </div>
                        <RecordActions
                          label={`${department.name} Department`}
                          onEdit={() => openEdit(department)}
                          onDelete={() => {
                            setDeleteError(null);
                            setDeleteTarget({
                              resource: "departments",
                              id: department.id,
                              label: `${department.name} (${department.code})`,
                              dependencyNote:
                                "Departments with Programs or Instructors cannot be deleted.",
                            });
                          }}
                        />
                      </article>
                    ))
                  : null}
                {section === "programs"
                  ? visiblePrograms.map((program) => {
                      const department = departmentById.get(
                        program.departmentId,
                      );
                      const college = department
                        ? collegeById.get(department.collegeId)
                        : undefined;
                      return (
                        <article className={styles.record} key={program.id}>
                          <div className={styles.recordMain}>
                            <div className={styles.recordHeading}>
                              <h2>{program.name}</h2>
                              <span className={styles.code}>
                                {program.code}
                              </span>
                            </div>
                            <p className={styles.parentPath}>
                              {college ? `${college.name} / ` : ""}
                              {program.department.name} <span>/</span>{" "}
                              {program.department.code}
                            </p>
                            <dl className={styles.recordFacts}>
                              <Fact
                                label="Duration"
                                value={`${program.durationYears} ${program.durationYears === 1 ? "year" : "years"}`}
                              />
                              <Fact
                                label="Coordinator"
                                value={instructorName(program.coordinator)}
                              />
                              {countValue(program.curriculumCourses) !==
                              null ? (
                                <Fact
                                  label="Curriculum courses"
                                  value={countValue(program.curriculumCourses)!}
                                />
                              ) : null}
                              {countValue(program.students) !== null ? (
                                <Fact
                                  label="Students"
                                  value={countValue(program.students)!}
                                />
                              ) : null}
                            </dl>
                          </div>
                          <RecordActions
                            label={`${program.name} Program`}
                            onEdit={() => openEdit(program)}
                            onDelete={() => {
                              setDeleteError(null);
                              setDeleteTarget({
                                resource: "programs",
                                id: program.id,
                                label: `${program.name} (${program.code})`,
                                dependencyNote:
                                  "Programs with curriculum courses, students, or applications cannot be deleted.",
                              });
                            }}
                          />
                        </article>
                      );
                    })
                  : null}
              </div>
            )}
          </>
        )}
      </section>

      {form ? (
        <StructureFormDialog
          form={form}
          colleges={colleges}
          departments={departments}
          programs={programs}
          instructors={instructors}
          instructorError={errors.instructors}
          collegesError={errors.colleges}
          departmentsError={errors.departments}
          onRetry={(resource) => void reload(resource)}
          pending={formPending}
          error={formError}
          onChange={setForm}
          onClose={() => setForm(null)}
          onSubmit={saveForm}
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
            aria-labelledby="structure-delete-title"
            aria-describedby="structure-delete-copy"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !deletePending)
                setDeleteTarget(null);
            }}
          >
            <DialogHeader
              title="Delete this record?"
              onClose={() => setDeleteTarget(null)}
              disabled={deletePending}
              titleId="structure-delete-title"
            />
            <p className={styles.dialogCopy} id="structure-delete-copy">
              Delete {deleteTarget.label}? {deleteTarget.dependencyNote} The
              backend will reject deletion when dependent records exist.
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
                onClick={() => void removeRecord()}
              >
                {deletePending ? "Deleting..." : "Confirm deletion"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function EmptyState({
  resource,
  onCreate,
  canCreate,
}: Readonly<{ resource: Section; onCreate: () => void; canCreate: boolean }>) {
  const Icon = sectionIcons[resource];
  return (
    <div className={styles.emptyState}>
      <Icon size={22} aria-hidden="true" />
      <h2>No {sectionLabels[resource].toLocaleLowerCase()} yet</h2>
      <p>
        {resource === "colleges"
          ? "Create a College to start the academic structure."
          : resource === "departments"
            ? "Create a Department under an existing College."
            : "Create a Program under an existing Department."}
      </p>
      {canCreate ? (
        <button
          className={styles.primaryButton}
          type="button"
          onClick={onCreate}
        >
          <Plus size={15} aria-hidden="true" /> Add{" "}
          {resource === "colleges"
            ? "college"
            : resource === "departments"
              ? "department"
              : "program"}
        </button>
      ) : null}
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

function RecordActions({
  label,
  onEdit,
  onDelete,
}: Readonly<{ label: string; onEdit: () => void; onDelete: () => void }>) {
  return (
    <div className={styles.recordActions}>
      <button
        className={styles.iconAction}
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        title="Edit"
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button
        className={`${styles.iconAction} ${styles.deleteAction}`}
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        title="Delete"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function StructureFormDialog({
  form,
  colleges,
  departments,
  programs,
  instructors,
  instructorError,
  collegesError,
  departmentsError,
  onRetry,
  pending,
  error,
  onChange,
  onClose,
  onSubmit,
}: Readonly<{
  form: FormState;
  colleges: readonly College[] | null;
  departments: readonly Department[] | null;
  programs: readonly Program[] | null;
  instructors: readonly Instructor[] | null;
  instructorError: string | null;
  collegesError: string | null;
  departmentsError: string | null;
  onRetry: (resource: Resource) => void;
  pending: boolean;
  error: string | null;
  onChange: (form: FormState) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}>) {
  const title = `${form.id ? "Edit" : "Create"} ${sectionLabels[form.kind].slice(0, -1).toLocaleLowerCase()}`;
  const usedDeanIds = new Set(
    (colleges ?? [])
      .filter((college) => college.id !== form.id)
      .map((college) => college.deanId)
      .filter(Boolean),
  );
  const usedHeadIds = new Set(
    (departments ?? [])
      .filter((department) => department.id !== form.id)
      .map((department) => department.headInstructorId)
      .filter(Boolean),
  );
  const usedCoordinatorIds = new Set(
    (programs ?? [])
      .filter((program) => program.id !== form.id)
      .map((program) => program.coordinatorInstructorId)
      .filter(Boolean),
  );

  const deanOptions = (instructors ?? []).filter(
    (instructor) =>
      !usedDeanIds.has(instructor.id) ||
      instructor.id === (form.kind === "colleges" ? form.deanId : null),
  );
  const headOptions =
    form.kind === "departments"
      ? (instructors ?? []).filter(
          (instructor) =>
            instructor.departmentId === form.id &&
            (!usedHeadIds.has(instructor.id) ||
              instructor.id === form.headInstructorId),
        )
      : [];
  const coordinatorOptions =
    form.kind === "programs"
      ? (instructors ?? []).filter(
          (instructor) =>
            instructor.departmentId === form.departmentId &&
            (!usedCoordinatorIds.has(instructor.id) ||
              instructor.id === form.coordinatorInstructorId),
        )
      : [];

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
        aria-labelledby="structure-form-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) onClose();
        }}
      >
        <header className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>ACADEMIC STRUCTURE</p>
            <h2 id="structure-form-title">{title}</h2>
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
          <label className={styles.formField}>
            <span>Name</span>
            <input
              autoFocus
              required
              value={form.name}
              onChange={(event) =>
                onChange({ ...form, name: event.target.value } as FormState)
              }
            />
          </label>
          <label className={styles.formField}>
            <span>Code</span>
            <input
              required
              value={form.code}
              onChange={(event) =>
                onChange({ ...form, code: event.target.value } as FormState)
              }
            />
          </label>

          {form.kind === "colleges" ? (
            instructors === null ? (
              <div className={styles.optionNotice} role="status">
                <span>
                  {instructorError ?? "Instructor options are unavailable."}{" "}
                  {form.id
                    ? "Existing Dean assignment will be preserved."
                    : "Create the College without assigning a Dean."}
                </span>
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => onRetry("instructors")}
                >
                  Retry
                </button>
              </div>
            ) : (
              <label className={styles.formField}>
                <span>Dean (optional)</span>
                <select
                  value={form.deanId ?? ""}
                  onChange={(event) =>
                    onChange({ ...form, deanId: event.target.value || null })
                  }
                >
                  <option value="">No Dean assigned</option>
                  {deanOptions.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.user.firstName} {instructor.user.lastName} ·{" "}
                      {instructor.employeeNumber}
                    </option>
                  ))}
                </select>
                <small>
                  Each instructor may be Dean of at most one College.
                </small>
              </label>
            )
          ) : null}

          {form.kind === "departments" ? (
            <>
              {colleges === null ? (
                <div className={styles.formError} role="alert">
                  <p>
                    {collegesError ??
                      "Colleges must load before a Department can be assigned."}
                  </p>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => onRetry("colleges")}
                  >
                    Retry Colleges
                  </button>
                </div>
              ) : (
                <label className={styles.formField}>
                  <span>Parent College</span>
                  <select
                    required
                    value={form.collegeId}
                    onChange={(event) =>
                      onChange({ ...form, collegeId: event.target.value })
                    }
                  >
                    <option value="">Select a College</option>
                    {colleges.map((college) => (
                      <option key={college.id} value={college.id}>
                        {college.name} ({college.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {form.id ? (
                instructors === null ? (
                  <div className={styles.optionNotice} role="status">
                    <span>
                      {instructorError ?? "Instructor options are unavailable."}{" "}
                      Existing Department Head assignment will be preserved.
                    </span>
                    <button
                      className={styles.textButton}
                      type="button"
                      onClick={() => onRetry("instructors")}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <label className={styles.formField}>
                    <span>Department Head (optional)</span>
                    <select
                      value={form.headInstructorId ?? ""}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          headInstructorId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">No Head assigned</option>
                      {headOptions.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.user.firstName} {instructor.user.lastName}{" "}
                          · {instructor.employeeNumber}
                        </option>
                      ))}
                    </select>
                    <small>
                      Only an instructor assigned to this Department can be
                      Head.
                    </small>
                  </label>
                )
              ) : null}
            </>
          ) : null}

          {form.kind === "programs" ? (
            <>
              {departments === null ? (
                <div className={styles.formError} role="alert">
                  <p>
                    {departmentsError ??
                      "Departments must load before a Program can be assigned."}
                  </p>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => onRetry("departments")}
                  >
                    Retry Departments
                  </button>
                </div>
              ) : (
                <label className={styles.formField}>
                  <span>Parent Department</span>
                  <select
                    required
                    value={form.departmentId}
                    onChange={(event) =>
                      onChange({
                        ...form,
                        departmentId: event.target.value,
                        coordinatorInstructorId:
                          event.target.value === form.departmentId
                            ? form.coordinatorInstructorId
                            : null,
                      })
                    }
                  >
                    <option value="">Select a Department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.college.name} / {department.name} (
                        {department.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className={styles.formField}>
                <span>Duration (years)</span>
                <input
                  required
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={form.durationYears}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      durationYears: Number(event.target.value),
                    })
                  }
                />
              </label>
              {form.id ? (
                instructors === null ? (
                  <div className={styles.optionNotice} role="status">
                    <span>
                      {instructorError ?? "Instructor options are unavailable."}{" "}
                      Existing Coordinator will be preserved unless the
                      Department changes.
                    </span>
                    <button
                      className={styles.textButton}
                      type="button"
                      onClick={() => onRetry("instructors")}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <label className={styles.formField}>
                    <span>Program Coordinator (optional)</span>
                    <select
                      value={form.coordinatorInstructorId ?? ""}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          coordinatorInstructorId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">No Coordinator assigned</option>
                      {coordinatorOptions.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.user.firstName} {instructor.user.lastName}{" "}
                          · {instructor.employeeNumber}
                        </option>
                      ))}
                    </select>
                    <small>
                      Coordinator must belong to the selected Department and may
                      coordinate only one Program.
                    </small>
                  </label>
                )
              ) : null}
            </>
          ) : null}

          {instructors === null &&
          instructorError &&
          form.kind !== "programs" ? (
            <p className={styles.optionWarning}>
              Leadership options unavailable: {instructorError}
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
                (form.kind === "departments" &&
                  (!colleges || colleges.length === 0)) ||
                (form.kind === "programs" &&
                  (!departments || departments.length === 0))
              }
            >
              {pending
                ? "Saving..."
                : form.id
                  ? "Save changes"
                  : `Create ${form.kind.slice(0, -1)}`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DialogHeader({
  title,
  titleId,
  onClose,
  disabled,
}: Readonly<{
  title: string;
  titleId: string;
  onClose: () => void;
  disabled: boolean;
}>) {
  return (
    <header className={styles.dialogHeader}>
      <div>
        <p className={styles.eyebrow}>ACADEMIC STRUCTURE</p>
        <h2 id={titleId}>{title}</h2>
      </div>
      <button
        className={styles.iconButton}
        type="button"
        aria-label="Close dialog"
        disabled={disabled}
        onClick={onClose}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </header>
  );
}
