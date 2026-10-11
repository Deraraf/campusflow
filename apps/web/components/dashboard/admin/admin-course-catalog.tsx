"use client";

import { useState } from "react";
import { BookOpen, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import styles from "./admin-course-management.module.css";

export type CourseRecord = Readonly<{
  id: string;
  code: string;
  title: string;
  description: string | null;
  curriculumCourses: number | readonly unknown[];
  offerings: number | readonly unknown[];
  createdAt: string;
  updatedAt: string;
}>;

type CourseForm = Readonly<{
  id?: string;
  code: string;
  title: string;
  description: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCourseRecord(value: unknown): value is CourseRecord {
  if (!isRecord(value)) return false;
  const countShape = (field: unknown) =>
    typeof field === "number" || Array.isArray(field);
  return (
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.title === "string" &&
    (typeof value.description === "string" || value.description === null) &&
    countShape(value.curriculumCourses) &&
    countShape(value.offerings) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function countValue(value: number | readonly unknown[]) {
  return typeof value === "number" ? value.toLocaleString() : null;
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
    // Use a status message for non-JSON responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

export default function AdminCourseCatalog({
  initialCourses,
  loadError,
}: Readonly<{
  initialCourses: readonly CourseRecord[] | null;
  loadError: string | null;
}>) {
  const [courses, setCourses] = useState(initialCourses);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<CourseForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(loadError);

  const visibleCourses = (courses ?? []).filter((course) =>
    `${course.code} ${course.title} ${course.description ?? ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  async function reload() {
    try {
      const response = await fetch("/api/admin/courses", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isCourseRecord)) {
        throw new Error("Course data has an unexpected format.");
      }
      setCourses(data);
      setListError(null);
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Courses could not be loaded.",
      );
    }
  }

  function openCreate() {
    setNotice(null);
    setFormError(null);
    setForm({ code: "", title: "", description: "" });
  }

  function openEdit(course: CourseRecord) {
    setNotice(null);
    setFormError(null);
    setForm({
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description ?? "",
    });
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || formPending) return;
    const code = form.code.trim();
    const title = form.title.trim();
    if (!code || !title) {
      setFormError("Course code and title are required.");
      return;
    }

    setFormPending(true);
    setFormError(null);
    try {
      const creating = !form.id;
      const response = await fetch(
        creating
          ? "/api/admin/courses"
          : `/api/admin/courses/${encodeURIComponent(form.id!)}`,
        {
          method: creating ? "POST" : "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            title,
            description: form.description.trim() || null,
          }),
        },
      );
      if (!response.ok) throw new Error(await apiError(response));
      setForm(null);
      setNotice(creating ? "Course created." : "Course updated.");
      await reload();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The course could not be saved.",
      );
    } finally {
      setFormPending(false);
    }
  }

  async function deleteCourse() {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const response = await fetch(
        `/api/admin/courses/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );
      if (!response.ok) throw new Error(await apiError(response));
      setDeleteTarget(null);
      setNotice("Course deleted.");
      await reload();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The course could not be deleted.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Course catalog</h1>
          <p className={styles.description}>
            Manage reusable course records independently from their term-based
            offerings.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
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
      {listError ? (
        <div className={styles.errorBanner} role="alert">
          <p>
            {courses
              ? `Could not refresh courses; showing the last loaded list. ${listError}`
              : listError}
          </p>
          <button
            className={styles.textButton}
            type="button"
            onClick={() => void reload()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {courses === null ? (
        listError ? null : (
          <div
            className={styles.loadingSkeleton}
            aria-busy="true"
            aria-label="Loading courses"
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
                Search courses by code, title, or description
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search course catalog"
              />
            </label>
            <p className={styles.resultCount} aria-live="polite">
              {visibleCourses.length.toLocaleString()} of{" "}
              {courses.length.toLocaleString()} courses
            </p>
          </div>
          {courses.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={22} aria-hidden="true" />
              <h2>No courses yet</h2>
              <p>
                Add a course to the reusable catalog. Offerings are managed
                separately.
              </p>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={openCreate}
              >
                <Plus size={15} aria-hidden="true" /> Add course
              </button>
            </div>
          ) : visibleCourses.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={20} aria-hidden="true" />
              <h2>No matching courses</h2>
              <p>Try another code, title, or description search.</p>
            </div>
          ) : (
            <div className={styles.recordList}>
              {visibleCourses.map((course) => (
                <article className={styles.record} key={course.id}>
                  <div className={styles.recordMain}>
                    <div className={styles.recordHeading}>
                      <h2>{course.title}</h2>
                      <span className={styles.code}>{course.code}</span>
                    </div>
                    {course.description ? (
                      <p className={styles.recordDescription}>
                        {course.description}
                      </p>
                    ) : null}
                    <dl className={styles.recordFacts}>
                      {countValue(course.curriculumCourses) !== null ? (
                        <Fact
                          label="Curriculum placements"
                          value={countValue(course.curriculumCourses)!}
                        />
                      ) : null}
                      {countValue(course.offerings) !== null ? (
                        <Fact
                          label="Offerings"
                          value={countValue(course.offerings)!}
                        />
                      ) : null}
                      <Fact
                        label="Created"
                        value={formatDate(course.createdAt)}
                      />
                    </dl>
                  </div>
                  <div className={styles.recordActions}>
                    <button
                      className={styles.iconAction}
                      type="button"
                      aria-label={`Edit ${course.code} ${course.title}`}
                      title="Edit"
                      onClick={() => openEdit(course)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      className={`${styles.iconAction} ${styles.deleteAction}`}
                      type="button"
                      aria-label={`Delete ${course.code} ${course.title}`}
                      title="Delete"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(course);
                      }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {form ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formPending)
              setForm(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-form-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !formPending) setForm(null);
            }}
          >
            <header className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>COURSE CATALOG</p>
                <h2 id="course-form-title">
                  {form.id ? "Edit course" : "Create course"}
                </h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Close dialog"
                disabled={formPending}
                onClick={() => setForm(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <form className={styles.form} onSubmit={submitForm}>
              <label className={styles.formField}>
                <span>Course code</span>
                <input
                  autoFocus
                  required
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value })
                  }
                />
              </label>
              <label className={styles.formField}>
                <span>Course title</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </label>
              <label className={styles.formField}>
                <span>Description (optional)</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              {formError ? (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              ) : null}
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={formPending}
                  onClick={() => setForm(null)}
                >
                  Cancel
                </button>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={formPending}
                >
                  {formPending
                    ? "Saving..."
                    : form.id
                      ? "Save changes"
                      : "Create course"}
                </button>
              </div>
            </form>
          </section>
        </div>
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
            aria-labelledby="course-delete-title"
            aria-describedby="course-delete-description"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !deletePending)
                setDeleteTarget(null);
            }}
          >
            <header className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>COURSE CATALOG</p>
                <h2 id="course-delete-title">Delete course?</h2>
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
            <p className={styles.dialogCopy} id="course-delete-description">
              Delete {deleteTarget.code} · {deleteTarget.title}? The backend
              prevents deletion while curriculum placements or offerings
              reference this Course.
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
                onClick={() => void deleteCourse()}
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

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
