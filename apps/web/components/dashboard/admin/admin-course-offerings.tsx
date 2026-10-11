"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { isCourseRecord, type CourseRecord } from "./admin-course-catalog";
import styles from "./admin-course-management.module.css";

export type AcademicYear = Readonly<{
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}>;
export type AcademicTerm = Readonly<{
  id: string;
  academicYearId: string;
  semester: "FIRST" | "SECOND" | "SUMMER";
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}>;
export type Instructor = Readonly<{
  id: string;
  employeeNumber: string;
  departmentId: string;
  user: Readonly<{ firstName: string; lastName: string }>;
  department?: Readonly<{ id: string; name: string; code: string }> | null;
}>;
type CourseOffering = Readonly<{
  id: string;
  courseId: string;
  academicTermId: string;
  instructorId: string;
  section: string;
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
  course: Readonly<{ id: string; code: string; title: string }>;
  academicTerm: Readonly<{
    id: string;
    semester: AcademicTerm["semester"];
    academicYearId: string;
    academicYear: Readonly<{ id: string; name: string }>;
  }>;
  instructor: Readonly<{
    id: string;
    employeeNumber: string;
    user: Readonly<{ firstName: string; lastName: string }>;
  }>;
  meetings: number | readonly unknown[];
  enrollments: number | readonly unknown[];
}>;
type CourseMeeting = Readonly<{
  id: string;
  offeringId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string | null;
  createdAt: string;
  updatedAt: string;
}>;
type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
type OfferingForm = {
  id?: string;
  courseId: string;
  yearId: string;
  termId: string;
  instructorId: string;
  section: string;
  capacity: string;
};
type MeetingForm = {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
};
type OptionErrors = Readonly<{
  years: string | null;
  courses: string | null;
  instructors: string | null;
}>;

const days: readonly DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const semesters: Record<AcademicTerm["semester"], string> = {
  FIRST: "First semester",
  SECOND: "Second semester",
  SUMMER: "Summer term",
};
const dayNames: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
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
function isInstructor(value: unknown): value is Instructor {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.employeeNumber === "string" &&
    typeof value.departmentId === "string" &&
    isRecord(value.user) &&
    typeof value.user.firstName === "string" &&
    typeof value.user.lastName === "string"
  );
}
function isOffering(value: unknown): value is CourseOffering {
  if (
    !isRecord(value) ||
    !isRecord(value.course) ||
    !isRecord(value.academicTerm) ||
    !isRecord(value.instructor)
  )
    return false;
  if (
    !isRecord(value.academicTerm.academicYear) ||
    !isRecord(value.instructor.user)
  )
    return false;
  return (
    typeof value.id === "string" &&
    typeof value.courseId === "string" &&
    typeof value.academicTermId === "string" &&
    typeof value.instructorId === "string" &&
    typeof value.section === "string" &&
    (typeof value.capacity === "number" || value.capacity === null) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.course.id === "string" &&
    typeof value.course.code === "string" &&
    typeof value.course.title === "string" &&
    typeof value.academicTerm.id === "string" &&
    ["FIRST", "SECOND", "SUMMER"].includes(
      String(value.academicTerm.semester),
    ) &&
    typeof value.academicTerm.academicYearId === "string" &&
    typeof value.academicTerm.academicYear.id === "string" &&
    typeof value.academicTerm.academicYear.name === "string" &&
    typeof value.instructor.id === "string" &&
    typeof value.instructor.employeeNumber === "string" &&
    typeof value.instructor.user.firstName === "string" &&
    typeof value.instructor.user.lastName === "string" &&
    (typeof value.meetings === "number" || Array.isArray(value.meetings)) &&
    (typeof value.enrollments === "number" || Array.isArray(value.enrollments))
  );
}
function isMeeting(value: unknown): value is CourseMeeting {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.offeringId === "string" &&
    days.includes(value.dayOfWeek as DayOfWeek) &&
    typeof value.startTime === "string" &&
    typeof value.endTime === "string" &&
    (typeof value.room === "string" || value.room === null) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}
function countValue(value: number | readonly unknown[]) {
  return typeof value === "number" ? value.toLocaleString() : null;
}
function instructorName(value: Instructor | CourseOffering["instructor"]) {
  const name = [value.user.firstName, value.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name ? `${name} · ${value.employeeNumber}` : value.employeeNumber;
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
    // Use a status message for non-JSON responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

export default function AdminCourseOfferings({
  years,
  courses,
  instructors,
  errors: initialErrors,
}: Readonly<{
  years: readonly AcademicYear[] | null;
  courses: readonly CourseRecord[] | null;
  instructors: readonly Instructor[] | null;
  errors: OptionErrors;
}>) {
  const [yearOptions, setYearOptions] = useState(years);
  const [courseOptions, setCourseOptions] = useState(courses);
  const [instructorOptions, setInstructorOptions] = useState(instructors);
  const [optionErrors, setOptionErrors] = useState(initialErrors);
  const [selectedYearId, setSelectedYearId] = useState(
    () => years?.find((year) => year.isCurrent)?.id ?? years?.[0]?.id ?? "",
  );
  const [terms, setTerms] = useState<readonly AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [termsReloadKey, setTermsReloadKey] = useState(0);
  const preferredTermRef = useRef<string | null>(null);
  const [offerings, setOfferings] = useState<readonly CourseOffering[] | null>(
    null,
  );
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [offeringForm, setOfferingForm] = useState<OfferingForm | null>(null);
  const [formTerms, setFormTerms] = useState<readonly AcademicTerm[]>([]);
  const [formTermsLoading, setFormTermsLoading] = useState(false);
  const [formTermsError, setFormTermsError] = useState<string | null>(null);
  const formTermsRequestRef = useRef(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseOffering | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [meetingOffering, setMeetingOffering] = useState<CourseOffering | null>(
    null,
  );
  const [meetings, setMeetings] = useState<readonly CourseMeeting[] | null>(
    null,
  );
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState<MeetingForm | null>(null);
  const [meetingFormError, setMeetingFormError] = useState<string | null>(null);
  const [meetingPending, setMeetingPending] = useState(false);
  const [meetingDelete, setMeetingDelete] = useState<CourseMeeting | null>(
    null,
  );
  const [meetingDeleteError, setMeetingDeleteError] = useState<string | null>(
    null,
  );
  const [meetingDeletePending, setMeetingDeletePending] = useState(false);

  const selectedYear =
    yearOptions?.find((year) => year.id === selectedYearId) ?? null;
  const selectedTerm = terms.find((term) => term.id === selectedTermId) ?? null;
  const visibleOfferings = (offerings ?? []).filter((offering) =>
    `${offering.course.code} ${offering.course.title} ${offering.section} ${instructorName(offering.instructor)}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    let active = true;
    setTerms([]);
    setSelectedTermId("");
    setTermsError(null);
    setOfferings(null);
    setOfferingsError(null);
    if (!selectedYearId) {
      setTermsLoading(false);
      return;
    }
    setTermsLoading(true);
    fetch(
      `/api/admin/admission-years/${encodeURIComponent(selectedYearId)}/terms`,
      { credentials: "same-origin", cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(await apiError(response));
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isAcademicTerm))
          throw new Error("Academic term data has an unexpected format.");
        if (!active) return;
        setTerms(data);
        const preferred =
          data.find((term) => term.id === preferredTermRef.current) ??
          data.find((term) => term.isCurrent) ??
          data[0];
        preferredTermRef.current = null;
        setSelectedTermId(preferred?.id ?? "");
      })
      .catch((error: unknown) => {
        if (active)
          setTermsError(
            error instanceof Error
              ? error.message
              : "Terms could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setTermsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedYearId, termsReloadKey]);

  useEffect(() => {
    let active = true;
    setOfferings(null);
    setOfferingsError(null);
    if (!selectedTermId) {
      setOfferingsLoading(false);
      return;
    }
    setOfferingsLoading(true);
    fetch(
      `/api/admin/course-offerings/terms/${encodeURIComponent(selectedTermId)}`,
      { credentials: "same-origin", cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(await apiError(response));
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isOffering))
          throw new Error("Offering data has an unexpected format.");
        if (active) setOfferings(data);
      })
      .catch((error: unknown) => {
        if (active)
          setOfferingsError(
            error instanceof Error
              ? error.message
              : "Offerings could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setOfferingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTermId]);

  async function reloadOfferings(termId = selectedTermId) {
    if (!termId) return;
    setOfferingsLoading(true);
    setOfferingsError(null);
    try {
      const response = await fetch(
        `/api/admin/course-offerings/terms/${encodeURIComponent(termId)}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isOffering))
        throw new Error("Offering data has an unexpected format.");
      setOfferings(data);
    } catch (error) {
      setOfferingsError(
        error instanceof Error
          ? error.message
          : "Offerings could not be loaded.",
      );
    } finally {
      setOfferingsLoading(false);
    }
  }

  async function loadFormTerms(yearId: string) {
    const requestId = ++formTermsRequestRef.current;
    setFormTerms([]);
    setFormTermsError(null);
    if (!yearId) {
      setFormTermsLoading(false);
      return;
    }
    setFormTermsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/admission-years/${encodeURIComponent(yearId)}/terms`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isAcademicTerm))
        throw new Error("Academic term data has an unexpected format.");
      if (requestId !== formTermsRequestRef.current) return;
      setFormTerms(data);
      if (data.length === 0)
        setFormTermsError("No terms exist for the selected academic year.");
    } catch (error) {
      if (requestId === formTermsRequestRef.current)
        setFormTermsError(
          error instanceof Error ? error.message : "Terms could not be loaded.",
        );
    } finally {
      if (requestId === formTermsRequestRef.current) setFormTermsLoading(false);
    }
  }

  async function openCreateOffering() {
    setNotice(null);
    setFormError(null);
    const startYearId =
      selectedYearId ||
      yearOptions?.find((year) => year.isCurrent)?.id ||
      yearOptions?.[0]?.id ||
      "";
    const matchingTerms = startYearId === selectedYearId ? terms : [];
    const initialTerm =
      matchingTerms.find((term) => term.isCurrent) ?? matchingTerms[0];
    setOfferingForm({
      courseId: "",
      yearId: startYearId,
      termId: initialTerm?.id ?? "",
      instructorId: "",
      section: "",
      capacity: "",
    });
    setFormTerms(matchingTerms);
    setFormTermsError(null);
    if (startYearId && matchingTerms.length === 0)
      await loadFormTerms(startYearId);
  }

  async function openEditOffering(offering: CourseOffering) {
    setNotice(null);
    setFormError(null);
    setOfferingForm({
      id: offering.id,
      courseId: offering.courseId,
      yearId: offering.academicTerm.academicYearId,
      termId: offering.academicTermId,
      instructorId: offering.instructorId,
      section: offering.section,
      capacity: offering.capacity === null ? "" : String(offering.capacity),
    });
    await loadFormTerms(offering.academicTerm.academicYearId);
  }

  async function submitOffering(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offeringForm || formPending) return;
    const sectionValue = offeringForm.section.trim();
    if (
      !offeringForm.courseId ||
      !offeringForm.termId ||
      !offeringForm.instructorId ||
      !sectionValue
    ) {
      setFormError(
        "Course, academic term, instructor, and section are required.",
      );
      return;
    }
    const capacityValue =
      offeringForm.capacity.trim() === ""
        ? null
        : Number(offeringForm.capacity);
    if (
      capacityValue !== null &&
      (!Number.isInteger(capacityValue) || capacityValue < 1)
    ) {
      setFormError("Capacity must be a positive whole number or left empty.");
      return;
    }
    if (
      !formTerms.some(
        (term) =>
          term.id === offeringForm.termId &&
          term.academicYearId === offeringForm.yearId,
      )
    ) {
      setFormError("Select a term that belongs to the chosen academic year.");
      return;
    }

    setFormPending(true);
    setFormError(null);
    try {
      const body = {
        academicTermId: offeringForm.termId,
        instructorId: offeringForm.instructorId,
        section: sectionValue,
        capacity: capacityValue,
      };
      const url = offeringForm.id
        ? `/api/admin/course-offerings/${encodeURIComponent(offeringForm.id)}`
        : `/api/admin/courses/${encodeURIComponent(offeringForm.courseId)}/offerings`;
      const response = await fetch(url, {
        method: offeringForm.id ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const movingToYear = offeringForm.yearId;
      const movingToTerm = offeringForm.termId;
      const remainsOnSameTerm =
        movingToYear === selectedYearId && movingToTerm === selectedTermId;
      preferredTermRef.current = movingToTerm;
      setOfferingForm(null);
      setNotice(
        offeringForm.id
          ? "Course offering updated."
          : "Course offering created.",
      );
      setSelectedYearId(movingToYear);
      setSelectedTermId(movingToTerm);
      if (remainsOnSameTerm) await reloadOfferings(movingToTerm);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The course offering could not be saved.",
      );
    } finally {
      setFormPending(false);
    }
  }

  async function deleteOffering() {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const response = await fetch(
        `/api/admin/course-offerings/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      setDeleteTarget(null);
      setNotice("Course offering deleted.");
      await reloadOfferings();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The course offering could not be deleted.",
      );
    } finally {
      setDeletePending(false);
    }
  }

  async function openMeetings(offering: CourseOffering) {
    setMeetingOffering(offering);
    setMeetings(null);
    setMeetingsError(null);
    setMeetingForm(null);
    setMeetingsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/course-offerings/${encodeURIComponent(offering.id)}/meetings`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isMeeting))
        throw new Error("Course meeting data has an unexpected format.");
      setMeetings(data);
    } catch (error) {
      setMeetingsError(
        error instanceof Error
          ? error.message
          : "Course meetings could not be loaded.",
      );
    } finally {
      setMeetingsLoading(false);
    }
  }

  async function reloadMeetings(offeringId = meetingOffering?.id) {
    if (!offeringId) return;
    setMeetingsLoading(true);
    setMeetingsError(null);
    try {
      const response = await fetch(
        `/api/admin/course-offerings/${encodeURIComponent(offeringId)}/meetings`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isMeeting))
        throw new Error("Course meeting data has an unexpected format.");
      setMeetings(data);
    } catch (error) {
      setMeetingsError(
        error instanceof Error
          ? error.message
          : "Course meetings could not be loaded.",
      );
    } finally {
      setMeetingsLoading(false);
    }
  }

  function openCreateMeeting() {
    setMeetingFormError(null);
    setMeetingForm({
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      room: "",
    });
  }
  function openEditMeeting(meeting: CourseMeeting) {
    setMeetingFormError(null);
    setMeetingForm({
      id: meeting.id,
      dayOfWeek: meeting.dayOfWeek,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      room: meeting.room ?? "",
    });
  }

  async function submitMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!meetingOffering || !meetingForm || meetingPending) return;
    if (
      !meetingForm.startTime ||
      !meetingForm.endTime ||
      meetingForm.startTime >= meetingForm.endTime
    ) {
      setMeetingFormError(
        "Enter valid 24-hour times with the start before the end.",
      );
      return;
    }
    setMeetingPending(true);
    setMeetingFormError(null);
    try {
      const body = {
        dayOfWeek: meetingForm.dayOfWeek,
        startTime: meetingForm.startTime,
        endTime: meetingForm.endTime,
        room: meetingForm.room.trim() || null,
      };
      const url = meetingForm.id
        ? `/api/admin/course-offerings/${encodeURIComponent(meetingOffering.id)}/meetings/${encodeURIComponent(meetingForm.id)}`
        : `/api/admin/course-offerings/${encodeURIComponent(meetingOffering.id)}/meetings`;
      const response = await fetch(url, {
        method: meetingForm.id ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await apiError(response));
      setMeetingForm(null);
      await reloadMeetings(meetingOffering.id);
      await reloadOfferings();
    } catch (error) {
      setMeetingFormError(
        error instanceof Error
          ? error.message
          : "The course meeting could not be saved.",
      );
    } finally {
      setMeetingPending(false);
    }
  }

  async function deleteMeeting() {
    if (!meetingOffering || !meetingDelete || meetingDeletePending) return;
    setMeetingDeletePending(true);
    setMeetingDeleteError(null);
    try {
      const response = await fetch(
        `/api/admin/course-offerings/${encodeURIComponent(meetingOffering.id)}/meetings/${encodeURIComponent(meetingDelete.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      setMeetingDelete(null);
      await reloadMeetings(meetingOffering.id);
      await reloadOfferings();
    } catch (error) {
      setMeetingDeleteError(
        error instanceof Error
          ? error.message
          : "The meeting could not be deleted.",
      );
    } finally {
      setMeetingDeletePending(false);
    }
  }

  async function retryOptions(resource: "years" | "courses" | "instructors") {
    setOptionErrors((current) => ({ ...current, [resource]: null }));
    try {
      const response = await fetch(
        `/api/admin/${resource === "years" ? "admission-years" : resource === "instructors" ? "academic-structure/instructors" : "courses"}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const data: unknown = await response.json();
      const valid =
        resource === "courses"
          ? Array.isArray(data) && data.every(isCourseRecord)
          : resource === "years"
            ? Array.isArray(data) && data.every(isAcademicYear)
            : Array.isArray(data) && data.every(isInstructor);
      if (!valid) throw new Error(`${resource} data has an unexpected format.`);
      if (resource === "years") setYearOptions(data as AcademicYear[]);
      if (resource === "courses") setCourseOptions(data as CourseRecord[]);
      if (resource === "instructors")
        setInstructorOptions(data as Instructor[]);
    } catch (error) {
      setOptionErrors((current) => ({
        ...current,
        [resource]:
          error instanceof Error
            ? error.message
            : `${resource} could not be loaded.`,
      }));
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Course offerings</h1>
          <p className={styles.description}>
            Manage actual course sections delivered within an academic term.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={
            !selectedTerm ||
            !courseOptions?.length ||
            !instructorOptions?.length
          }
          onClick={() => void openCreateOffering()}
        >
          <Plus size={16} aria-hidden="true" /> Add offering
        </button>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {Object.entries(optionErrors).map(([resource, message]) =>
        message ? (
          <div className={styles.errorBanner} role="alert" key={resource}>
            <p>
              {resource === "years"
                ? "Academic years"
                : resource === "courses"
                  ? "Courses"
                  : "Instructors"}{" "}
              unavailable: {message}
            </p>
            <button
              className={styles.textButton}
              type="button"
              onClick={() =>
                void retryOptions(
                  resource as "years" | "courses" | "instructors",
                )
              }
            >
              Retry
            </button>
          </div>
        ) : null,
      )}

      {years === null ? (
        optionErrors.years ? null : (
          <div className={styles.loadingSkeleton} aria-busy="true">
            <span />
            <span />
          </div>
        )
      ) : years.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarDays size={22} aria-hidden="true" />
          <h2>No academic years</h2>
          <p>Create an academic year and terms before managing offerings.</p>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <label className={styles.filterField}>
              <span>Academic year</span>
              <select
                value={selectedYearId}
                onChange={(event) => setSelectedYearId(event.target.value)}
              >
                <option value="">Select year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                    {year.isCurrent ? " · Current" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Academic term</span>
              <select
                value={selectedTermId}
                disabled={!selectedYearId || termsLoading || terms.length === 0}
                onChange={(event) => setSelectedTermId(event.target.value)}
              >
                <option value="">Select term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {semesters[term.semester]}
                    {term.isCurrent ? " · Current" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.searchField}>
              <Search size={16} aria-hidden="true" />
              <span className={styles.visuallyHidden}>Search offerings</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search course, section, or instructor"
              />
            </label>
            {selectedTermId && !termsError && offerings ? (
              <p className={styles.resultCount} aria-live="polite">
                {visibleOfferings.length} of {offerings.length} offerings
              </p>
            ) : null}
          </div>

          {selectedYear && selectedTerm ? (
            <p className={styles.filterContext}>
              {selectedYear.name} · {formatDate(selectedYear.startDate)} to{" "}
              {formatDate(selectedYear.endDate)}
              <span> / </span>
              {semesters[selectedTerm.semester]} ·{" "}
              {formatDate(selectedTerm.startDate)} to{" "}
              {formatDate(selectedTerm.endDate)}
            </p>
          ) : null}

          {termsLoading ? (
            <div
              className={styles.loadingSkeleton}
              aria-busy="true"
              aria-label="Loading terms"
            >
              <span />
              <span />
            </div>
          ) : termsError ? (
            <div className={styles.errorBanner} role="alert">
              <p>{termsError}</p>
              <button
                className={styles.textButton}
                type="button"
                onClick={() => setTermsReloadKey((key) => key + 1)}
              >
                Retry terms
              </button>
            </div>
          ) : !selectedYearId ? (
            <div className={styles.emptyState}>
              <CalendarDays size={20} aria-hidden="true" />
              <p>Select an academic year to view its terms.</p>
            </div>
          ) : terms.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays size={20} aria-hidden="true" />
              <h2>No terms for this year</h2>
              <p>Choose another year or create a term in Academic Calendar.</p>
            </div>
          ) : !selectedTermId ? (
            <div className={styles.emptyState}>
              <CalendarDays size={20} aria-hidden="true" />
              <p>Select a term to list its course offerings.</p>
            </div>
          ) : offeringsLoading ? (
            <div
              className={styles.loadingSkeleton}
              aria-busy="true"
              aria-label="Loading course offerings"
            >
              <span />
              <span />
              <span />
            </div>
          ) : offeringsError ? (
            <div className={styles.errorBanner} role="alert">
              <p>{offeringsError}</p>
              <button
                className={styles.textButton}
                type="button"
                onClick={() => void reloadOfferings()}
              >
                Retry
              </button>
            </div>
          ) : offerings === null ? null : offerings.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays size={20} aria-hidden="true" />
              <h2>No offerings in this term</h2>
              <p>
                Create an offering to assign a catalog course, instructor, and
                section to this term.
              </p>
              {courseOptions && instructorOptions ? (
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => void openCreateOffering()}
                >
                  <Plus size={15} aria-hidden="true" /> Add offering
                </button>
              ) : null}
            </div>
          ) : visibleOfferings.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={20} aria-hidden="true" />
              <h2>No matching offerings</h2>
              <p>Try another course, section, or instructor search.</p>
            </div>
          ) : (
            <div className={styles.recordList}>
              {visibleOfferings.map((offering) => (
                <article className={styles.record} key={offering.id}>
                  <div className={styles.recordMain}>
                    <div className={styles.recordHeading}>
                      <h2>{offering.course.title}</h2>
                      <span className={styles.code}>
                        {offering.course.code}
                      </span>
                      <span className={styles.sectionBadge}>
                        Section {offering.section}
                      </span>
                    </div>
                    <p className={styles.recordDescription}>
                      {offering.academicTerm.academicYear.name} ·{" "}
                      {semesters[offering.academicTerm.semester]}
                    </p>
                    <dl className={styles.recordFacts}>
                      <Fact
                        label="Instructor"
                        value={instructorName(offering.instructor)}
                      />
                      <Fact
                        label="Capacity"
                        value={
                          offering.capacity === null
                            ? "Not set"
                            : offering.capacity.toLocaleString()
                        }
                      />
                      {countValue(offering.meetings) !== null ? (
                        <Fact
                          label="Meetings"
                          value={countValue(offering.meetings)!}
                        />
                      ) : null}
                      {countValue(offering.enrollments) !== null ? (
                        <Fact
                          label="Enrollments"
                          value={countValue(offering.enrollments)!}
                        />
                      ) : null}
                    </dl>
                  </div>
                  <div className={styles.offeringActions}>
                    <button
                      className={styles.textButton}
                      type="button"
                      onClick={() => void openMeetings(offering)}
                    >
                      <Clock3 size={14} aria-hidden="true" /> Meetings
                    </button>
                    <button
                      className={styles.iconAction}
                      type="button"
                      aria-label={`Edit ${offering.course.code} Section ${offering.section}`}
                      title="Edit"
                      onClick={() => void openEditOffering(offering)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      className={`${styles.iconAction} ${styles.deleteAction}`}
                      type="button"
                      aria-label={`Delete ${offering.course.code} Section ${offering.section}`}
                      title="Delete"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(offering);
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

      {offeringForm ? (
        <OfferingFormDialog
          form={offeringForm}
          years={yearOptions}
          courses={courseOptions}
          instructors={instructorOptions}
          formTerms={formTerms}
          selectedYear={
            yearOptions?.find((year) => year.id === offeringForm.yearId) ?? null
          }
          termsLoading={formTermsLoading}
          termsError={formTermsError}
          error={formError}
          pending={formPending}
          onChange={setOfferingForm}
          onYearChange={(yearId) => {
            setOfferingForm({ ...offeringForm, yearId, termId: "" });
            void loadFormTerms(yearId);
          }}
          onRetryTerms={() => void loadFormTerms(offeringForm.yearId)}
          onClose={() => setOfferingForm(null)}
          onSubmit={submitOffering}
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
            aria-labelledby="offering-delete-title"
            aria-describedby="offering-delete-copy"
          >
            <header className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>COURSE OFFERING</p>
                <h2 id="offering-delete-title">Delete offering?</h2>
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
            <p className={styles.dialogCopy} id="offering-delete-copy">
              Delete {deleteTarget.course.code} Section {deleteTarget.section}?
              The backend blocks deletion when enrollments, assignments, exams,
              attendance, or meetings depend on this offering.
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
                onClick={() => void deleteOffering()}
              >
                {deletePending ? "Deleting..." : "Confirm deletion"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {meetingOffering ? (
        <MeetingManager
          offering={meetingOffering}
          meetings={meetings}
          loading={meetingsLoading}
          loadError={meetingsError}
          form={meetingForm}
          formError={meetingFormError}
          pending={meetingPending}
          deleteTarget={meetingDelete}
          deleteError={meetingDeleteError}
          deletePending={meetingDeletePending}
          onRetry={() => void reloadMeetings(meetingOffering.id)}
          onClose={() => {
            setMeetingOffering(null);
            setMeetingForm(null);
          }}
          onCreate={openCreateMeeting}
          onEdit={openEditMeeting}
          onFormChange={setMeetingForm}
          onFormSubmit={submitMeeting}
          onFormClose={() => setMeetingForm(null)}
          onDelete={(meeting) => {
            setMeetingDeleteError(null);
            setMeetingDelete(meeting);
          }}
          onDeleteCancel={() => setMeetingDelete(null)}
          onDeleteConfirm={() => void deleteMeeting()}
        />
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

function OfferingFormDialog({
  form,
  years,
  courses,
  instructors,
  formTerms,
  selectedYear,
  termsLoading,
  termsError,
  error,
  pending,
  onChange,
  onYearChange,
  onRetryTerms,
  onClose,
  onSubmit,
}: Readonly<{
  form: OfferingForm;
  years: readonly AcademicYear[] | null;
  courses: readonly CourseRecord[] | null;
  instructors: readonly Instructor[] | null;
  formTerms: readonly AcademicTerm[];
  selectedYear: AcademicYear | null;
  termsLoading: boolean;
  termsError: string | null;
  error: string | null;
  pending: boolean;
  onChange: (form: OfferingForm) => void;
  onYearChange: (yearId: string) => void;
  onRetryTerms: () => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}>) {
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
        aria-labelledby="offering-form-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) onClose();
        }}
      >
        <header className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>COURSE OFFERING</p>
            <h2 id="offering-form-title">
              {form.id ? "Edit offering" : "Create offering"}
            </h2>
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
              <small>The Course is fixed when editing an offering.</small>
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
                <option value="">Select a Course</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.title}
                  </option>
                ))}
              </select>
              {courses === null ? (
                <small>
                  Courses are unavailable; retry the Course option list.
                </small>
              ) : null}
            </label>
          )}
          <div className={styles.formRow}>
            <label className={styles.formField}>
              <span>Academic year</span>
              <select
                required
                value={form.yearId}
                disabled={!years?.length}
                onChange={(event) => onYearChange(event.target.value)}
              >
                <option value="">Select a year</option>
                {years?.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                    {year.isCurrent ? " · Current" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formField}>
              <span>Academic term</span>
              <select
                required
                value={form.termId}
                disabled={!form.yearId || termsLoading || !formTerms.length}
                onChange={(event) =>
                  onChange({ ...form, termId: event.target.value })
                }
              >
                <option value="">Select a term</option>
                {formTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {semesters[term.semester]}
                    {term.isCurrent ? " · Current" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {termsLoading ? (
            <p className={styles.formHint} role="status">
              Loading terms for {selectedYear?.name ?? "selected year"}...
            </p>
          ) : null}
          {termsError ? (
            <div className={styles.errorBanner} role="alert">
              <p>{termsError}</p>
              <button
                className={styles.textButton}
                type="button"
                onClick={onRetryTerms}
              >
                Retry terms
              </button>
            </div>
          ) : null}
          <label className={styles.formField}>
            <span>Instructor</span>
            <select
              required
              value={form.instructorId}
              disabled={!instructors?.length}
              onChange={(event) =>
                onChange({ ...form, instructorId: event.target.value })
              }
            >
              <option value="">Select an Instructor</option>
              {instructors?.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.user.firstName} {instructor.user.lastName} ·{" "}
                  {instructor.employeeNumber}
                  {instructor.department
                    ? ` · ${instructor.department.name}`
                    : ""}
                </option>
              ))}
            </select>
            {instructors === null ? (
              <small>Instructor records could not be loaded.</small>
            ) : null}
          </label>
          <div className={styles.formRow}>
            <label className={styles.formField}>
              <span>Section</span>
              <input
                required
                value={form.section}
                onChange={(event) =>
                  onChange({ ...form, section: event.target.value })
                }
              />
            </label>
            <label className={styles.formField}>
              <span>Capacity (optional)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={form.capacity}
                onChange={(event) =>
                  onChange({ ...form, capacity: event.target.value })
                }
              />
            </label>
          </div>
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
                termsLoading ||
                Boolean(termsError) ||
                !courses?.length ||
                !instructors?.length
              }
            >
              {pending
                ? "Saving..."
                : form.id
                  ? "Save changes"
                  : "Create offering"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MeetingManager({
  offering,
  meetings,
  loading,
  loadError,
  form,
  formError,
  pending,
  deleteTarget,
  deleteError,
  deletePending,
  onRetry,
  onClose,
  onCreate,
  onEdit,
  onFormChange,
  onFormSubmit,
  onFormClose,
  onDelete,
  onDeleteCancel,
  onDeleteConfirm,
}: Readonly<{
  offering: CourseOffering;
  meetings: readonly CourseMeeting[] | null;
  loading: boolean;
  loadError: string | null;
  form: MeetingForm | null;
  formError: string | null;
  pending: boolean;
  deleteTarget: CourseMeeting | null;
  deleteError: string | null;
  deletePending: boolean;
  onRetry: () => void;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (meeting: CourseMeeting) => void;
  onFormChange: (form: MeetingForm) => void;
  onFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFormClose: () => void;
  onDelete: (meeting: CourseMeeting) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}>) {
  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !form && !deleteTarget)
          onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meetings-title"
      >
        <header className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>OFFERING SCHEDULE</p>
            <h2 id="meetings-title">
              {offering.course.code} · Section {offering.section}
            </h2>
            <p className={styles.dialogSubtitle}>{offering.course.title}</p>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="Close meetings"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.meetingHeading}>
          <div>
            <h3>Course meetings</h3>
            <p>
              Instructor conflicts are checked by the backend for this term.
            </p>
          </div>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={onCreate}
          >
            <Plus size={15} aria-hidden="true" /> Add meeting
          </button>
        </div>
        {loading ? (
          <div className={styles.loadingSkeleton} aria-busy="true">
            <span />
            <span />
          </div>
        ) : loadError ? (
          <div className={styles.errorBanner} role="alert">
            <p>{loadError}</p>
            <button
              className={styles.textButton}
              type="button"
              onClick={onRetry}
            >
              Retry
            </button>
          </div>
        ) : meetings === null ? null : meetings.length === 0 ? (
          <div className={styles.emptyState}>
            <Clock3 size={20} aria-hidden="true" />
            <h3>No meeting schedule</h3>
            <p>Add a day and time for this course offering.</p>
          </div>
        ) : (
          <ul className={styles.meetingList}>
            {meetings.map((meeting) => (
              <li className={styles.meeting} key={meeting.id}>
                <div>
                  <strong>{dayNames[meeting.dayOfWeek]}</strong>
                  <span>
                    {meeting.startTime}–{meeting.endTime}
                    {meeting.room ? ` · ${meeting.room}` : ""}
                  </span>
                </div>
                <div className={styles.recordActions}>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => onEdit(meeting)}
                  >
                    Edit
                  </button>
                  <button
                    className={`${styles.iconAction} ${styles.deleteAction}`}
                    type="button"
                    aria-label={`Delete ${dayNames[meeting.dayOfWeek]} meeting`}
                    onClick={() => onDelete(meeting)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {form ? (
          <form className={styles.meetingForm} onSubmit={onFormSubmit}>
            <h3>{form.id ? "Edit meeting" : "Add meeting"}</h3>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                <span>Day</span>
                <select
                  autoFocus
                  value={form.dayOfWeek}
                  onChange={(event) =>
                    onFormChange({
                      ...form,
                      dayOfWeek: event.target.value as DayOfWeek,
                    })
                  }
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {dayNames[day]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.formField}>
                <span>Room (optional)</span>
                <input
                  value={form.room}
                  onChange={(event) =>
                    onFormChange({ ...form, room: event.target.value })
                  }
                />
              </label>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                <span>Start time</span>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(event) =>
                    onFormChange({ ...form, startTime: event.target.value })
                  }
                />
              </label>
              <label className={styles.formField}>
                <span>End time</span>
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(event) =>
                    onFormChange({ ...form, endTime: event.target.value })
                  }
                />
              </label>
            </div>
            {formError ? (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            ) : null}
            <div className={styles.dialogActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={pending}
                onClick={onFormClose}
              >
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={pending}
              >
                {pending
                  ? "Saving..."
                  : form.id
                    ? "Save meeting"
                    : "Add meeting"}
              </button>
            </div>
          </form>
        ) : null}
        {deleteTarget ? (
          <div
            className={styles.nestedConfirm}
            role="alertdialog"
            aria-labelledby="meeting-delete-title"
          >
            <h3 id="meeting-delete-title">Delete meeting?</h3>
            <p>
              {dayNames[deleteTarget.dayOfWeek]} {deleteTarget.startTime}–
              {deleteTarget.endTime}
              {deleteTarget.room ? ` · ${deleteTarget.room}` : ""}
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
                onClick={onDeleteCancel}
              >
                Cancel
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                disabled={deletePending}
                onClick={onDeleteConfirm}
              >
                {deletePending ? "Deleting..." : "Confirm deletion"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
