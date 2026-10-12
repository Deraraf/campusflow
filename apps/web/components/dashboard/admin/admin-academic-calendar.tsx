"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, Search, X } from "lucide-react";
import styles from "./admin-academic-calendar.module.css";

export type AcademicYear = Readonly<{
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type AcademicTerm = Readonly<{
  id: string;
  academicYearId: string;
  semester: "FIRST" | "SECOND" | "SUMMER";
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}>;

type YearForm = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

type TermForm = {
  id?: string;
  semester: AcademicTerm["semester"];
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

type DeleteTarget = Readonly<{
  kind: "year" | "term";
  id: string;
  yearId?: string;
  label: string;
}>;

type YearFilter = "ALL" | "CURRENT" | "OTHER";

const semesters: readonly AcademicTerm["semester"][] = [
  "FIRST",
  "SECOND",
  "SUMMER",
];

const semesterLabels: Record<AcademicTerm["semester"], string> = {
  FIRST: "First semester",
  SECOND: "Second semester",
  SUMMER: "Summer term",
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
    typeof value.isCurrent === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isAcademicTerm(value: unknown): value is AcademicTerm {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.academicYearId === "string" &&
    semesters.includes(value.semester as AcademicTerm["semester"]) &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.isCurrent === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function dateInputValue(value: string) {
  return value.slice(0, 10);
}

function toDateTime(value: string) {
  return `${value}T00:00:00.000Z`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

async function errorMessage(response: Response) {
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
    // Use the status message if the backend response is not JSON.
  }
  return `Request failed (${response.status}). Please try again.`;
}

export default function AdminAcademicCalendar({
  initialYears,
  loadError,
}: Readonly<{
  initialYears: readonly AcademicYear[] | null;
  loadError: string | null;
}>) {
  const [years, setYears] = useState<readonly AcademicYear[]>(
    initialYears ?? [],
  );
  const [selectedYearId, setSelectedYearId] = useState(
    () =>
      initialYears?.find((year) => year.isCurrent)?.id ??
      initialYears?.[0]?.id ??
      "",
  );
  const [yearSearch, setYearSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<YearFilter>("ALL");
  const [terms, setTerms] = useState<readonly AcademicTerm[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [yearDialog, setYearDialog] = useState<YearForm | null>(null);
  const [termDialog, setTermDialog] = useState<TermForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedYear = years.find((year) => year.id === selectedYearId) ?? null;
  const visibleYears = years.filter((year) => {
    const matchesSearch = year.name
      .toLocaleLowerCase()
      .includes(yearSearch.trim().toLocaleLowerCase());
    const matchesFilter =
      yearFilter === "ALL" ||
      (yearFilter === "CURRENT" && year.isCurrent) ||
      (yearFilter === "OTHER" && !year.isCurrent);
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    let active = true;
    if (!selectedYearId) {
      setTerms([]);
      setTermsLoading(false);
      setTermsError(null);
      return;
    }

    setTerms([]);
    setTermsLoading(true);
    setTermsError(null);
    fetch(
      `/api/admin/admission-years/${encodeURIComponent(selectedYearId)}/terms`,
      {
        credentials: "same-origin",
        cache: "no-store",
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorMessage(response));
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isAcademicTerm)) {
          throw new Error("Academic term data has an unexpected format.");
        }
        if (active) setTerms(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setTermsError(
            error instanceof Error
              ? error.message
              : "Academic terms could not be loaded.",
          );
          setTerms([]);
        }
      })
      .finally(() => {
        if (active) setTermsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedYearId]);

  async function refreshTerms(yearId: string) {
    setTermsLoading(true);
    setTermsError(null);
    try {
      const response = await fetch(
        `/api/admin/admission-years/${encodeURIComponent(yearId)}/terms`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await errorMessage(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isAcademicTerm)) {
        throw new Error("Academic term data has an unexpected format.");
      }
      setTerms(data);
    } catch (error) {
      setTermsError(
        error instanceof Error
          ? error.message
          : "Academic terms could not be loaded.",
      );
    } finally {
      setTermsLoading(false);
    }
  }

  function openYearForm(year?: AcademicYear) {
    setNotice(null);
    setFormError(null);
    setYearDialog(
      year
        ? {
            id: year.id,
            name: year.name,
            startDate: dateInputValue(year.startDate),
            endDate: dateInputValue(year.endDate),
            isCurrent: year.isCurrent,
          }
        : { name: "", startDate: "", endDate: "", isCurrent: false },
    );
  }

  async function saveYear(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!yearDialog || formPending) return;

    const name = yearDialog.name.trim();
    if (name.length < 2) {
      setFormError("Enter an academic year name with at least two characters.");
      return;
    }
    if (years.some((year) => year.id !== yearDialog.id && year.name === name)) {
      setFormError("An academic year with this name already exists.");
      return;
    }
    if (!yearDialog.startDate || !yearDialog.endDate) {
      setFormError("Enter both start and end dates.");
      return;
    }
    if (yearDialog.startDate >= yearDialog.endDate) {
      setFormError("The start date must be before the end date.");
      return;
    }

    setFormPending(true);
    setFormError(null);
    try {
      const isEditing = Boolean(yearDialog.id);
      const response = await fetch(
        isEditing
          ? `/api/admin/admission-years/${encodeURIComponent(yearDialog.id!)}`
          : "/api/admin/admission-years",
        {
          method: isEditing ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            startDate: toDateTime(yearDialog.startDate),
            endDate: toDateTime(yearDialog.endDate),
            isCurrent: yearDialog.isCurrent,
          }),
        },
      );
      if (!response.ok) throw new Error(await errorMessage(response));
      const result: unknown = await response.json();
      if (!isAcademicYear(result)) {
        throw new Error("The academic year response has an unexpected format.");
      }

      setYears((current) => {
        const withoutCurrentDesignation = result.isCurrent
          ? current.map((year) => ({ ...year, isCurrent: false }))
          : current;
        return isEditing
          ? withoutCurrentDesignation.map((year) =>
              year.id === result.id ? result : year,
            )
          : [...withoutCurrentDesignation, result].sort((left, right) =>
              left.startDate.localeCompare(right.startDate),
            );
      });
      setSelectedYearId(result.id);
      setYearDialog(null);
      setNotice(
        isEditing ? "Academic year updated." : "Academic year created.",
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The academic year could not be saved. Please try again.",
      );
    } finally {
      setFormPending(false);
    }
  }

  function openTermForm(term?: AcademicTerm) {
    if (!selectedYear) return;
    setNotice(null);
    setFormError(null);
    setTermDialog(
      term
        ? {
            id: term.id,
            semester: term.semester,
            startDate: dateInputValue(term.startDate),
            endDate: dateInputValue(term.endDate),
            isCurrent: term.isCurrent,
          }
        : { semester: "FIRST", startDate: "", endDate: "", isCurrent: false },
    );
  }

  async function saveTerm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!termDialog || !selectedYear || formPending) return;

    if (!termDialog.startDate || !termDialog.endDate) {
      setFormError("Enter both start and end dates.");
      return;
    }
    if (termDialog.startDate >= termDialog.endDate) {
      setFormError("The start date must be before the end date.");
      return;
    }
    if (
      terms.some(
        (term) =>
          term.id !== termDialog.id && term.semester === termDialog.semester,
      )
    ) {
      setFormError(
        "A term already exists for this semester and academic year.",
      );
      return;
    }
    if (termDialog.isCurrent && !selectedYear.isCurrent) {
      setFormError(
        "A current academic term must belong to the current academic year.",
      );
      return;
    }

    setFormPending(true);
    setFormError(null);
    try {
      const isEditing = Boolean(termDialog.id);
      const response = await fetch(
        isEditing
          ? `/api/admin/admission-years/${encodeURIComponent(selectedYear.id)}/terms/${encodeURIComponent(termDialog.id!)}`
          : `/api/admin/admission-years/${encodeURIComponent(selectedYear.id)}/terms`,
        {
          method: isEditing ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            semester: termDialog.semester,
            startDate: toDateTime(termDialog.startDate),
            endDate: toDateTime(termDialog.endDate),
            isCurrent: termDialog.isCurrent,
          }),
        },
      );
      if (!response.ok) throw new Error(await errorMessage(response));
      setTermDialog(null);
      setNotice(
        isEditing ? "Academic term updated." : "Academic term created.",
      );
      await refreshTerms(selectedYear.id);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The academic term could not be saved. Please try again.",
      );
    } finally {
      setFormPending(false);
    }
  }

  async function deleteCalendarRecord() {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const path =
        deleteTarget.kind === "year"
          ? `/api/admin/admission-years/${encodeURIComponent(deleteTarget.id)}`
          : `/api/admin/admission-years/${encodeURIComponent(deleteTarget.yearId ?? "")}/terms/${encodeURIComponent(deleteTarget.id)}`;
      const response = await fetch(path, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await errorMessage(response));

      if (deleteTarget.kind === "year") {
        const remainingYears = years.filter(
          (year) => year.id !== deleteTarget.id,
        );
        setYears(remainingYears);
        setSelectedYearId((currentId) =>
          currentId === deleteTarget.id
            ? (remainingYears.find((year) => year.isCurrent)?.id ??
              remainingYears[0]?.id ??
              "")
            : currentId,
        );
      } else if (deleteTarget.yearId) {
        await refreshTerms(deleteTarget.yearId);
      }

      setNotice(
        deleteTarget.kind === "year"
          ? "Academic year deleted."
          : "Academic term deleted.",
      );
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The calendar record could not be deleted.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  const retryYears = () => window.location.reload();

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Academic calendar</h1>
          <p className={styles.description}>
            Manage academic years and their first, second, and summer terms.
          </p>
        </div>
        {initialYears ? (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => openYearForm()}
          >
            <Plus size={16} aria-hidden="true" /> Add academic year
          </button>
        ) : null}
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {loadError ? (
        <section className={styles.errorPanel} role="alert">
          <h2>Academic years could not be loaded</h2>
          <p>{loadError}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={retryYears}
          >
            Retry
          </button>
        </section>
      ) : initialYears === null ? (
        <section className={styles.emptyPanel}>
          <CalendarDays size={22} aria-hidden="true" />
          <h2>Calendar data unavailable</h2>
          <p>No academic year data was returned.</p>
        </section>
      ) : years.length === 0 ? (
        <section className={styles.emptyPanel}>
          <CalendarDays size={22} aria-hidden="true" />
          <h2>No academic years yet</h2>
          <p>Create an academic year to begin organizing terms.</p>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => openYearForm()}
          >
            <Plus size={16} aria-hidden="true" /> Add academic year
          </button>
        </section>
      ) : (
        <div className={styles.workspace}>
          <section
            className={styles.yearPanel}
            aria-labelledby="year-list-heading"
          >
            <div className={styles.panelHeading}>
              <div>
                <h2 id="year-list-heading">Academic years</h2>
                <p>{years.length.toLocaleString()} total</p>
              </div>
            </div>
            <div className={styles.yearFilters}>
              <label className={styles.searchField}>
                <Search size={16} aria-hidden="true" />
                <span className={styles.visuallyHidden}>
                  Search academic years
                </span>
                <input
                  value={yearSearch}
                  onChange={(event) => setYearSearch(event.target.value)}
                  placeholder="Search years"
                />
              </label>
              <label className={styles.visuallyHidden} htmlFor="year-filter">
                Filter academic years
              </label>
              <select
                id="year-filter"
                value={yearFilter}
                onChange={(event) =>
                  setYearFilter(event.target.value as YearFilter)
                }
              >
                <option value="ALL">All years</option>
                <option value="CURRENT">Current</option>
                <option value="OTHER">Not current</option>
              </select>
            </div>
            {visibleYears.length === 0 ? (
              <p className={styles.inlineEmpty}>
                No academic years match these filters.
              </p>
            ) : (
              <ul className={styles.yearList}>
                {visibleYears.map((year) => (
                  <li key={year.id}>
                    <button
                      className={`${styles.yearItem} ${selectedYearId === year.id ? styles.yearItemSelected : ""}`}
                      type="button"
                      aria-pressed={selectedYearId === year.id}
                      onClick={() => setSelectedYearId(year.id)}
                    >
                      <span className={styles.yearItemTop}>
                        <strong>{year.name}</strong>
                        {year.isCurrent ? (
                          <span className={styles.currentBadge}>Current</span>
                        ) : null}
                      </span>
                      <span className={styles.yearRange}>
                        {formatRange(year.startDate, year.endDate)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.termPanel} aria-labelledby="terms-heading">
            {selectedYear ? (
              <>
                <header className={styles.termHeader}>
                  <div>
                    <p className={styles.eyebrow}>SELECTED ACADEMIC YEAR</p>
                    <h2>{selectedYear.name}</h2>
                    <p className={styles.yearRange}>
                      {formatRange(
                        selectedYear.startDate,
                        selectedYear.endDate,
                      )}
                    </p>
                  </div>
                  <div className={styles.headerActions}>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => openYearForm(selectedYear)}
                    >
                      Edit year
                    </button>
                    <button
                      className={styles.dangerTextButton}
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget({
                          kind: "year",
                          id: selectedYear.id,
                          label: selectedYear.name,
                        });
                      }}
                    >
                      Delete year
                    </button>
                  </div>
                </header>
                <div className={styles.panelHeading}>
                  <div>
                    <h3 id="terms-heading">Academic terms</h3>
                    <p>Terms associated with this year</p>
                  </div>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => openTermForm()}
                  >
                    <Plus size={16} aria-hidden="true" /> Add term
                  </button>
                </div>
                {termsError ? (
                  <div className={styles.errorInline} role="alert">
                    <p>{termsError}</p>
                    <button
                      className={styles.textButton}
                      type="button"
                      onClick={() => void refreshTerms(selectedYear.id)}
                    >
                      Retry
                    </button>
                  </div>
                ) : termsLoading ? (
                  <div
                    className={styles.termsSkeleton}
                    aria-label="Loading academic terms"
                    aria-busy="true"
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                ) : terms.length === 0 ? (
                  <div className={styles.inlineEmpty}>
                    <CalendarDays size={20} aria-hidden="true" />
                    <p>No terms have been created for this academic year.</p>
                    <button
                      className={styles.textButton}
                      type="button"
                      onClick={() => openTermForm()}
                    >
                      Add the first term
                    </button>
                  </div>
                ) : (
                  <div className={styles.termList}>
                    {terms.map((term) => (
                      <article className={styles.termCard} key={term.id}>
                        <div className={styles.termCardMain}>
                          <div className={styles.termTitleRow}>
                            <h4>{semesterLabels[term.semester]}</h4>
                            {term.isCurrent ? (
                              <span className={styles.currentBadge}>
                                Current
                              </span>
                            ) : null}
                          </div>
                          <p>{formatRange(term.startDate, term.endDate)}</p>
                        </div>
                        <div className={styles.termCardActions}>
                          <button
                            className={styles.textButton}
                            type="button"
                            onClick={() => openTermForm(term)}
                          >
                            Edit term
                          </button>
                          <button
                            className={styles.dangerTextButton}
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget({
                                kind: "term",
                                id: term.id,
                                yearId: selectedYear.id,
                                label: semesterLabels[term.semester],
                              });
                            }}
                          >
                            Delete term
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.inlineEmpty}>
                <CalendarDays size={20} aria-hidden="true" />
                <p>Select an academic year to view its terms.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {yearDialog ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formPending)
              setYearDialog(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="year-dialog-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !formPending) setYearDialog(null);
            }}
          >
            <DialogHeader
              title={
                yearDialog.id ? "Edit academic year" : "Create academic year"
              }
              onClose={() => setYearDialog(null)}
              disabled={formPending}
            />
            <form className={styles.form} onSubmit={saveYear}>
              <label className={styles.formField}>
                <span>Academic year name</span>
                <input
                  autoFocus
                  required
                  minLength={2}
                  value={yearDialog.name}
                  onChange={(event) =>
                    setYearDialog({ ...yearDialog, name: event.target.value })
                  }
                />
              </label>
              <div className={styles.dateFields}>
                <label className={styles.formField}>
                  <span>Start date</span>
                  <input
                    required
                    type="date"
                    value={yearDialog.startDate}
                    max={yearDialog.endDate || undefined}
                    onChange={(event) =>
                      setYearDialog({
                        ...yearDialog,
                        startDate: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.formField}>
                  <span>End date</span>
                  <input
                    required
                    type="date"
                    value={yearDialog.endDate}
                    min={yearDialog.startDate || undefined}
                    onChange={(event) =>
                      setYearDialog({
                        ...yearDialog,
                        endDate: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={yearDialog.isCurrent}
                  onChange={(event) =>
                    setYearDialog({
                      ...yearDialog,
                      isCurrent: event.target.checked,
                    })
                  }
                />
                <span>Set as current academic year</span>
              </label>
              <p className={styles.formHint}>
                Setting this year as current clears the current designation from
                any other year.
              </p>
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
                  onClick={() => setYearDialog(null)}
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
                    : yearDialog.id
                      ? "Save changes"
                      : "Create year"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {termDialog && selectedYear ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formPending)
              setTermDialog(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="term-dialog-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !formPending) setTermDialog(null);
            }}
          >
            <DialogHeader
              title={
                termDialog.id ? "Edit academic term" : "Create academic term"
              }
              subtitle={selectedYear.name}
              onClose={() => setTermDialog(null)}
              disabled={formPending}
            />
            <form className={styles.form} onSubmit={saveTerm}>
              <label className={styles.formField}>
                <span>Term</span>
                <select
                  autoFocus
                  value={termDialog.semester}
                  onChange={(event) =>
                    setTermDialog({
                      ...termDialog,
                      semester: event.target.value as AcademicTerm["semester"],
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
              <div className={styles.dateFields}>
                <label className={styles.formField}>
                  <span>Start date</span>
                  <input
                    required
                    type="date"
                    value={termDialog.startDate}
                    max={termDialog.endDate || undefined}
                    onChange={(event) =>
                      setTermDialog({
                        ...termDialog,
                        startDate: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.formField}>
                  <span>End date</span>
                  <input
                    required
                    type="date"
                    value={termDialog.endDate}
                    min={termDialog.startDate || undefined}
                    onChange={(event) =>
                      setTermDialog({
                        ...termDialog,
                        endDate: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={termDialog.isCurrent}
                  onChange={(event) => {
                    if (event.target.checked && !selectedYear.isCurrent) {
                      setFormError(
                        "A current academic term must belong to the current academic year.",
                      );
                      return;
                    }
                    setFormError(null);
                    setTermDialog({
                      ...termDialog,
                      isCurrent: event.target.checked,
                    });
                  }}
                />
                <span>Set as current term</span>
              </label>
              {!selectedYear.isCurrent ? (
                <p className={styles.formHint}>
                  A term can be marked current only when its academic year is
                  current.
                </p>
              ) : (
                <p className={styles.formHint}>
                  Setting this term as current clears the current designation
                  from another term.
                </p>
              )}
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
                  onClick={() => setTermDialog(null)}
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
                    : termDialog.id
                      ? "Save changes"
                      : "Create term"}
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
            if (event.target === event.currentTarget && !deletePending) {
              setDeleteTarget(null);
            }
          }}
        >
          <section
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-calendar-title"
            aria-describedby="delete-calendar-description"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !deletePending) {
                setDeleteTarget(null);
              }
            }}
          >
            <DialogHeader
              title={`Delete ${deleteTarget.kind === "year" ? "academic year" : "academic term"}?`}
              titleId="delete-calendar-title"
              onClose={() => setDeleteTarget(null)}
              disabled={deletePending}
            />
            <p className={styles.dialogCopy} id="delete-calendar-description">
              Delete {deleteTarget.label}? The backend will prevent deletion if
              this record is still used by academic terms, admitted students,
              course offerings, or academic standings.
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
                onClick={() => void deleteCalendarRecord()}
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

function DialogHeader({
  title,
  subtitle,
  titleId,
  onClose,
  disabled,
}: Readonly<{
  title: string;
  subtitle?: string;
  titleId?: string;
  onClose: () => void;
  disabled: boolean;
}>) {
  return (
    <header className={styles.dialogHeader}>
      <div>
        <p className={styles.eyebrow}>ACADEMIC CALENDAR</p>
        <h2
          id={
            titleId ??
            (title.includes("year") ? "year-dialog-title" : "term-dialog-title")
          }
        >
          {title}
        </h2>
        {subtitle ? <p className={styles.dialogSubtitle}>{subtitle}</p> : null}
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
