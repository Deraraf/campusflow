import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  FileText,
  FlaskConical,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LibraryBig,
  Megaphone,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/api/server";

const navigationGroups: {
  title: string;
  items: { label: string; href: string; icon: LucideIcon }[];
}[] = [
  {
    title: "EXECUTIVE OVERSIGHT",
    items: [
      { label: "Institutional health", href: "#overview", icon: LayoutDashboard },
      { label: "Colleges & departments", href: "#departments", icon: Landmark },
      { label: "Enrollment & admissions", href: "#enrollment", icon: GraduationCap },
      { label: "Faculty & staff", href: "#faculty", icon: Users },
    ],
  },
  {
    title: "OPERATIONS & FINANCE",
    items: [
      { label: "Campus facilities", href: "#facilities", icon: Building2 },
      { label: "Budget & research", href: "#grants", icon: Wallet },
      { label: "Accreditation", href: "#accreditation", icon: ShieldCheck },
    ],
  },
  {
    title: "GOVERNANCE & SETTINGS",
    items: [
      { label: "Senate & policies", href: "#governance", icon: BookOpen },
      { label: "System audit log", href: "#system-audits", icon: Activity },
      { label: "Console settings", href: "#governance", icon: Settings2 },
    ],
  },
];

const metrics = [
  {
    label: "TOTAL ENROLLMENT",
    value: "28,450",
    change: "+3.8%",
    detail: "year over year",
    icon: Users,
    color: "text-sky-600 dark:text-sky-300",
    accent: "bg-sky-500",
  },
  {
    label: "FULL-TIME FACULTY",
    value: "1,420",
    change: "84.6%",
    detail: "retention rate",
    icon: GraduationCap,
    color: "text-cyan-700 dark:text-cyan-300",
    accent: "bg-cyan-500",
  },
  {
    label: "ACTIVE RESEARCH GRANTS",
    value: "$148.6M",
    change: "+9.1%",
    detail: "awarded this year",
    icon: FlaskConical,
    color: "text-teal-700 dark:text-teal-300",
    accent: "bg-teal-500",
  },
  {
    label: "SPACE UTILIZATION",
    value: "84.2%",
    change: "Peak 92%",
    detail: "weekday average",
    icon: Building2,
    color: "text-amber-700 dark:text-amber-300",
    accent: "bg-amber-500",
  },
  {
    label: "ACCREDITATION",
    value: "100%",
    change: "On track",
    detail: "all standards met",
    icon: ShieldCheck,
    color: "text-emerald-700 dark:text-emerald-300",
    accent: "bg-emerald-500",
  },
];

const departments = [
  { name: "College of Computing & AI", dean: "Dean Arthur Holloway", enrollment: "5,840", capacity: 94, rosters: "98.2%", grants: "$54.2M", status: "Nominal", tone: "teal" },
  { name: "College of Engineering", dean: "Dean Linh Chen", enrollment: "8,120", capacity: 104, rosters: "94.8%", grants: "$61.9M", status: "Lab strain", tone: "amber" },
  { name: "College of Arts & Sciences", dean: "Dean Margaret Ross", enrollment: "9,410", capacity: 86, rosters: "86.2%", grants: "$19.5M", status: "Roster delay", tone: "rose" },
  { name: "School of Business & Economics", dean: "Dean Jonathan Vance-Perez", enrollment: "4,080", capacity: 92, rosters: "89.0%", grants: "$13.0M", status: "Review", tone: "blue" },
];

const decisions = [
  {
    type: "TENURE DOSSIER REVIEW",
    title: "Dr. Marcus Sterling, Associate Professor",
    detail: "Computing & AI · Committee endorsement pending",
    due: "Due in 48h",
    action: "Endorse tenure",
    tone: "amber",
  },
  {
    type: "GRANT MATCH AUTHORIZATION",
    title: "DARPA Quantum Initiative Match ($2.4M)",
    detail: "Research office recommendation ready for review",
    due: "3 days left",
    action: "Authorize funds",
    tone: "cyan",
  },
  {
    type: "ACADEMIC DEGREE CHARTER",
    title: "M.S. in Applied AI Ethics & Governance",
    detail: "Senate approved · Provost signature required",
    due: "Q3 review",
    action: "Review charter",
    tone: "slate",
  },
];

const facilities = [
  { label: "AUDITORIUMS & HALLS", value: 88, detail: "36 of 41 spaces active", icon: Landmark, color: "bg-sky-500" },
  { label: "RESEARCH WET LABS", value: 94, detail: "Near capacity in Bio-Engineering", icon: FlaskConical, color: "bg-amber-500" },
  { label: "MAIN LIBRARY STACKS", value: 72, detail: "Optimal density", icon: LibraryBig, color: "bg-cyan-500" },
  { label: "DORM OCCUPANCY", value: 99, detail: "11,480 residential students", icon: Building2, color: "bg-rose-500" },
];

function Panel({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111b2e] ${className}`}
    >
      {children}
    </section>
  );
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (user?.role !== "ADMIN") {
    redirect("/student");
  }

  const adminName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <main
      id="overview"
      className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100"
    >
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-slate-50 xl:block dark:border-slate-800 dark:bg-[#0d1628]">
          <div className="sticky top-[66px] flex h-[calc(100vh-66px)] flex-col overflow-y-auto px-3 py-5">
            <div className="mb-5 px-2">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                ADMIN CONSOLE
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Institutional operations
              </p>
            </div>

            {navigationGroups.map((group) => (
              <div className="mb-5" key={group.title}>
                <p className="mb-2 px-2 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                  {group.title}
                </p>
                <nav aria-label={group.title} className="space-y-1">
                  {group.items.map((item, index) => {
                    const Icon = item.icon;
                    const active = group.title === "EXECUTIVE OVERSIGHT" && index === 0;

                    return (
                      <Link
                        className={`flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                          active
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-950/20"
                            : "text-slate-600 hover:bg-slate-200/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        }`}
                        href={item.href}
                        key={item.label}
                      >
                        <Icon aria-hidden="true" size={15} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}

            <div className="mt-auto rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#111b2e]">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <span>INSTITUTIONAL AUDIT</span>
                <span className="text-emerald-600 dark:text-emerald-400">In progress</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full w-[74%] rounded-full bg-amber-400" />
              </div>
              <p className="mt-2 flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Completion target</span>
                <span>Nov 15</span>
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <nav
            aria-label="Admin dashboard sections"
            className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 xl:hidden dark:border-slate-800 dark:bg-[#111b2e]"
          >
            {navigationGroups.flatMap((group) => group.items).map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${
                    index === 0
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  <Icon aria-hidden="true" size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-4 p-4 sm:p-5 lg:space-y-5 lg:p-7">
            <header className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-[#111b2e]">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <span>Fall 2026</span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span>Week 8 of 16</span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span>Academic operations</span>
                </div>
                <h1 className="text-xl font-bold sm:text-2xl">
                  Welcome back, {adminName || "Administrator"}
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Campus operations are running at nominal capacity. Three executive actions need your review.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  href="#risk-alerts"
                >
                  <Megaphone aria-hidden="true" size={14} />
                  Emergency broadcast
                </Link>
                <Link
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  href="#system-audits"
                >
                  <ShieldCheck aria-hidden="true" size={14} />
                  System audits
                </Link>
                <Link
                  className="inline-flex min-h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500"
                  href="#departments"
                >
                  <FileText aria-hidden="true" size={14} />
                  Board report data
                </Link>
              </div>
            </header>

            <section
              aria-label="Grade certification notice"
              className="flex flex-col gap-3 rounded-lg border border-amber-300/80 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-900/70 dark:bg-[#2b2417]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <CalendarDays aria-hidden="true" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Midterm grade certification window open
                  <span className="ml-2 inline-flex rounded bg-amber-200 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase text-amber-900 dark:bg-amber-700 dark:text-amber-50">
                    5 days left
                  </span>
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  91.4% of class rosters are certified. 18 departmental submissions remain pending.
                </p>
              </div>
              <Link
                className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-[#111b2e] dark:text-slate-200 dark:ring-amber-900"
                href="#departments"
              >
                Review departments <ArrowRight aria-hidden="true" size={13} />
              </Link>
            </section>

            <section aria-label="Institutional indicators" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <article
                    className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111b2e]"
                    id={metric.label === "ACCREDITATION" ? "accreditation" : undefined}
                    key={metric.label}
                  >
                    <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                      <span>{metric.label}</span>
                      <Icon aria-hidden="true" className={metric.color} size={15} />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <strong className="truncate text-xl font-bold sm:text-2xl">{metric.value}</strong>
                      <span className={`whitespace-nowrap text-[10px] font-bold ${metric.color}`}>
                        {metric.change}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{metric.detail}</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full w-3/4 rounded-full ${metric.accent}`} />
                    </div>
                  </article>
                );
              })}
            </section>

            <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,0.85fr)]">
              <div className="min-w-0 space-y-4">
                <Panel className="overflow-hidden" >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
                    <div>
                      <h2 className="text-sm font-bold">Colleges &amp; academic departments</h2>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Enrollment, certification, capacity, and sponsored research
                      </p>
                    </div>
                    <Link className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-300" href="#departments">
                      All units <ChevronRight aria-hidden="true" size={14} />
                    </Link>
                  </div>
                  <div className="overflow-x-auto" id="departments">
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 dark:bg-[#0f192b] dark:text-slate-400">
                          <th className="px-4 py-3 font-semibold sm:px-5">COLLEGE &amp; LEADERSHIP</th>
                          <th className="px-3 py-3 font-semibold">ENROLLMENT</th>
                          <th className="px-3 py-3 font-semibold">CAPACITY</th>
                          <th className="px-3 py-3 font-semibold">ROSTERS</th>
                          <th className="px-3 py-3 font-semibold">RESEARCH</th>
                          <th className="px-4 py-3 text-right font-semibold sm:px-5">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.map((department) => (
                          <tr className="border-t border-slate-100 dark:border-slate-800/80" key={department.name}>
                            <td className="px-4 py-3.5 sm:px-5">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{department.name}</p>
                              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{department.dean}</p>
                            </td>
                            <td className="px-3 py-3.5 text-xs font-semibold tabular-nums">{department.enrollment}</td>
                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div className={`h-full rounded-full ${department.capacity > 100 ? "w-full bg-amber-500" : "w-4/5 bg-blue-500"}`} />
                                </div>
                                <span className={`text-[10px] font-semibold ${department.capacity > 100 ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>
                                  {department.capacity}.1%
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-xs font-semibold tabular-nums">{department.rosters}</td>
                            <td className="px-3 py-3.5 text-xs font-semibold tabular-nums">{department.grants}</td>
                            <td className="px-4 py-3.5 text-right sm:px-5">
                              <span className={`inline-flex rounded px-2 py-1 text-[9px] font-bold ${
                                department.tone === "teal"
                                  ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                                  : department.tone === "amber"
                                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                    : department.tone === "rose"
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              }`}>
                                {department.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-5">
                    <span>Showing 4 of 12 academic units</span>
                    <Link className="font-semibold text-blue-600 dark:text-blue-300" href="#departments">View all units</Link>
                  </div>
                </Panel>

                <Panel id="facilities" className="p-4 sm:p-5" >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold">Campus infrastructure &amp; space utilization</h2>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Live occupancy from 14 academic and research facilities</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Sensors calibrated 3m ago
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {facilities.map((facility) => {
                      const Icon = facility.icon;
                      return (
                        <article className="rounded-md bg-slate-50 p-3 dark:bg-[#0d1729]" key={facility.label}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{facility.label}</p>
                            <Icon aria-hidden="true" className="text-slate-400 dark:text-slate-500" size={14} />
                          </div>
                          <div className="mt-2 flex items-baseline gap-1">
                            <strong className="text-xl font-bold">{facility.value}%</strong>
                            {facility.value >= 94 ? <span className="text-[9px] font-bold text-amber-600 dark:text-amber-300">High</span> : null}
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className={`h-full rounded-full ${facility.color}`} style={{ width: `${facility.value}%` }} />
                          </div>
                          <p className="mt-2 text-[9px] leading-4 text-slate-500 dark:text-slate-400">{facility.detail}</p>
                        </article>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-col justify-between gap-2 rounded-md bg-slate-50 px-3 py-3 sm:flex-row sm:items-center dark:bg-[#0d1729]">
                    <p className="text-[11px] text-slate-700 dark:text-slate-200">
                      <Wrench className="mr-1.5 inline text-amber-600 dark:text-amber-300" size={13} />
                      <strong>Turing Science Quad HVAC scheduled maintenance:</strong> Friday 10:00 PM – Saturday 06:00 AM
                    </p>
                    <Link className="shrink-0 text-[10px] font-semibold text-blue-600 dark:text-blue-300" href="#facilities">View maintenance protocol</Link>
                  </div>
                </Panel>
              </div>

              <div className="min-w-0 space-y-4">
                <Panel id="governance" className="p-4 sm:p-5" >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Landmark aria-hidden="true" className="text-slate-500 dark:text-slate-400" size={16} />
                      <h2 className="text-sm font-bold">Executive decision queue</h2>
                    </div>
                    <span className="grid size-5 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">3</span>
                  </div>
                  <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                    {decisions.map((decision) => (
                      <article className="py-3 first:pt-1 last:pb-0" key={decision.title}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[9px] font-bold ${decision.tone === "amber" ? "text-amber-700 dark:text-amber-300" : decision.tone === "cyan" ? "text-cyan-700 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400"}`}>
                            {decision.type}
                          </p>
                          <span className="shrink-0 text-[9px] text-slate-500 dark:text-slate-400">{decision.due}</span>
                        </div>
                        <h3 className="mt-1.5 text-xs font-semibold leading-4">{decision.title}</h3>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{decision.detail}</p>
                        <Link className={`mt-2 inline-flex min-h-7 items-center rounded px-2.5 text-[10px] font-semibold ${decision.tone === "amber" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : decision.tone === "cyan" ? "bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`} href="#governance">
                          {decision.action}
                        </Link>
                      </article>
                    ))}
                  </div>
                </Panel>

                <Panel id="risk-alerts" className="p-4 sm:p-5" >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle aria-hidden="true" className="text-amber-600 dark:text-amber-300" size={16} />
                      <h2 className="text-sm font-bold">Institutional risk alerts</h2>
                    </div>
                    <span className="rounded bg-amber-100 px-2 py-1 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">2 flagged</span>
                  </div>
                  <article className="mt-3 rounded-md border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="text-amber-800 dark:text-amber-300">RETENTION WARNING</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">Undergrad cohort · 2nd yr</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold">42 first-generation STEM students flagged in Intro Calculus &amp; Physics.</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-600 dark:text-slate-400">Intervention: peer tutoring and advising outreach.</p>
                    <Link className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300" href="#enrollment">Review students <ArrowRight aria-hidden="true" size={12} /></Link>
                  </article>
                  <article className="mt-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="text-sky-700 dark:text-sky-300">COMPLIANCE REVIEW</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">Q3 review</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold">Annual federal Clery Act compliance package is ready for sign-off.</p>
                    <Link className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300" href="#accreditation">Review &amp; sign <ArrowRight aria-hidden="true" size={12} /></Link>
                  </article>
                </Panel>

                <Panel id="governance-calendar" className="p-4 sm:p-5" >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays aria-hidden="true" className="text-slate-500 dark:text-slate-400" size={16} />
                      <h2 className="text-sm font-bold">Governance calendar</h2>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">November 2026</span>
                  </div>
                  <article className="mt-3 flex gap-3 rounded-md bg-slate-50 p-3 dark:bg-[#0d1729]">
                    <div className="w-9 shrink-0 text-center">
                      <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-300">THU</span>
                      <strong className="text-lg leading-6">06</strong>
                    </div>
                    <div className="min-w-0 border-l border-slate-200 pl-3 dark:border-slate-700">
                      <h3 className="truncate text-xs font-semibold">Faculty Senate Plenary</h3>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">3:30 PM · Boardroom A · President&apos;s Hall</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Topic: General Policy in Examinations</p>
                    </div>
                  </article>
                  <article className="mt-2 flex gap-3 rounded-md bg-slate-50 p-3 dark:bg-[#0d1729]">
                    <div className="w-9 shrink-0 text-center">
                      <span className="block text-[9px] font-bold text-sky-700 dark:text-sky-300">TUE</span>
                      <strong className="text-lg leading-6">18</strong>
                    </div>
                    <div className="min-w-0 border-l border-slate-200 pl-3 dark:border-slate-700">
                      <h3 className="truncate text-xs font-semibold">Board of Trustees Quarterly</h3>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">9:00 AM · 2:00 PM · Executive Boardroom</p>
                      <p className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">Presenting: Research Endowment Yield</p>
                    </div>
                  </article>
                </Panel>
              </div>
            </div>

            <section aria-label="Oversight status" className="grid gap-3 md:grid-cols-3">
              <Panel id="enrollment" className="flex items-center gap-3 p-4" >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><GraduationCap aria-hidden="true" size={17} /></span>
                <div className="min-w-0"><p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">ENROLLMENT &amp; ADMISSIONS</p><p className="mt-1 text-xs font-semibold">Fall intake tracking <span className="text-emerald-600 dark:text-emerald-400">· On target</span></p></div>
              </Panel>
              <Panel id="faculty" className="flex items-center gap-3 p-4" >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><Users aria-hidden="true" size={17} /></span>
                <div className="min-w-0"><p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">FACULTY &amp; STAFF</p><p className="mt-1 text-xs font-semibold">Hiring plan <span className="text-slate-500 dark:text-slate-400">· 12 open positions</span></p></div>
              </Panel>
              <Panel id="grants" className="flex items-center gap-3 p-4" >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Wallet aria-hidden="true" size={17} /></span>
                <div className="min-w-0"><p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">BUDGET &amp; RESEARCH GRANTS</p><p className="mt-1 text-xs font-semibold">Quarterly close <span className="text-slate-500 dark:text-slate-400">· Nov 30</span></p></div>
              </Panel>
            </section>

            <footer id="system-audits" className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span>Institutional operations preview · Data updated 6:42 AM</span>
              <Link className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-300" href="#system-audits">
                View audit log <ArrowUpRight aria-hidden="true" size={12} />
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}