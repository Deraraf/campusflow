import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  MapPin,
  NotebookTabs,
  Settings2,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "../../../lib/api/server";
import LogoutButton from "../../(auth)/logout-button";
import styles from "./dashboard.module.css";

const courses = [
  { code: "CS 301", name: "Distributed Systems", instructor: "Prof. Marcus Sterling", units: "4.0 units", grade: "A", score: "94.2%", attendance: 96, tone: "blue" },
  { code: "CS 340", name: "Database Architecture", instructor: "Prof. Keith Morrison", units: "3.0 units", grade: "A-", score: "91.8%", attendance: 100, tone: "teal" },
  { code: "MATH 245", name: "Linear Algebra", instructor: "Prof. Ananya Roy", units: "4.0 units", grade: "B+", score: "88.5%", attendance: 92, tone: "amber" },
  { code: "PHIL 120", name: "Ethics in Artificial Intelligence", instructor: "Dr. Julian Thorne", units: "3.0 units", grade: "A", score: "96.0%", attendance: 98, tone: "green" },
];

const assignments = [
  { due: "DUE TODAY · 11:59 PM", title: "Machine Learning Benchmark Report", course: "CS 301 · 100 Points Total", detail: "Draft saved · 2 pages", action: "Continue draft", urgent: true },
  { due: "DUE TOMORROW · 5:00 PM", title: "Matrix Decompositions Quiz 3", course: "MATH 245 · Canvas Assessment", detail: "Single attempt allowed", action: "Open portal", urgent: false },
  { due: "DUE MON, OCT 05 · 11:59 PM", title: "Autonomous Vehicles Moral Dilemma Essay", course: "PHIL 120 · 2,500 words", detail: "Rubric attached · Criterion A-D", action: "Edit document", urgent: false },
];

const academicLinks: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "#overview", icon: LayoutDashboard },
  { label: "My courses", href: "#courses", icon: BookOpen },
  { label: "Class schedule", href: "#schedule", icon: CalendarDays },
  { label: "Grades & transcripts", href: "#grades", icon: NotebookTabs },
  { label: "Degree audit", href: "#degree-audit", icon: CheckCircle2 },
  { label: "Assignments", href: "#assignments", icon: Clock3 },
];

const campusLinks: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Library & resources", href: "#library", icon: LibraryBig },
  { label: "Tuition & financial aid", href: "#bursar", icon: Wallet },
  { label: "Campus services", href: "#campus-services", icon: MapPin },
];

function NavigationGroup({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string; icon: LucideIcon }[];
}) {
  return (
    <div
      className={
        title === "ACADEMIC"
          ? styles.navGroup
          : `${styles.navGroup} ${styles.secondaryNavGroup}`
      }
    >
      <p className={styles.navHeading}>{title}</p>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Link
            className={title === "ACADEMIC" && index === 0 ? styles.navActive : styles.navItem}
            href={item.href}
            key={item.label}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const displayName = user?.firstName || "Student";

  return (
    <main className={styles.page} id="overview">
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link className={styles.sidebarBrand} href="/">
            <span className={styles.sidebarMark}><GraduationCap size={18} /></span>
            <span><strong>CampusFlow</strong><small>STUDENT PORTAL</small></span>
          </Link>
          <div className={styles.termSelect}><span>Fall Term 2026</span><ChevronRight size={14} /></div>
          <NavigationGroup title="ACADEMIC" items={academicLinks} />
          <NavigationGroup title="CAMPUS LIFE" items={campusLinks} />
          <div className={`${styles.navGroup} ${styles.secondaryNavGroup}`}>
            <p className={styles.navHeading}>SUPPORT</p>
            <Link className={styles.navItem} href="#advising"><GraduationCap size={16} /> Academic advising</Link>
          </div>
          <div className={styles.sidebarAlert}>
            <AlertCircle size={16} />
            <div><strong>Registrar alert</strong><span>Spring priority registration opens Nov 10.</span></div>
          </div>
          <div className={styles.signOut}><LogoutButton /></div>
        </aside>

        <div className={styles.content}>
          <header className={styles.pageHeading}>
            <div>
              <div className={styles.headingMeta}>
                <span>FRIDAY, OCTOBER 02</span>
                <span className={styles.activeTerm}><i /> Active term</span>
              </div>
              <h1>Welcome back, {displayName}.</h1>
              <p>Week 2 of 16 · Fall Semester 2026 · B.S. in Computer Science · College of Computing &amp; Informatics</p>
            </div>
            <div className={styles.headingActions}>
              <Link className={styles.secondaryButton} href="#grades"><ArrowDownToLine size={15} /> Unofficial transcript</Link>
              <Link className={styles.primaryButton} href="#assignments"><CheckCircle2 size={15} /> Submit work</Link>
            </div>
          </header>

          <p className={styles.sampleNotice}><Sparkles size={14} /> Sample academic data shown for dashboard preview</p>

          <section className={styles.stats} aria-label="Academic overview">
            <article className={styles.statCard}>
              <div className={styles.statLabel}>CUMULATIVE GPA <GraduationCap size={14} /></div>
              <strong className={styles.statValue}>3.84 <small>/ 4.00</small></strong>
              <span className={`${styles.statTag} ${styles.blueTag}`}>Top 5% · Dean&apos;s List</span>
            </article>
            <article className={styles.statCard}>
              <div className={styles.statLabel}>CURRENT LOAD <BookOpen size={14} /></div>
              <strong className={styles.statValue}>16 <small>credits</small></strong>
              <span className={styles.statDetail}>5 active courses</span>
            </article>
            <article className={styles.statCard} id="degree-audit">
              <div className={styles.statLabel}>DEGREE AUDIT <CheckCircle2 size={14} /></div>
              <div className={styles.auditValue}><div><strong>74%</strong><span>89 / 120 units</span></div><span className={styles.auditRing}><i /></span></div>
              <div className={styles.progressTrack}><span className={styles.progressBlue} /></div>
            </article>
            <article className={styles.statCard}>
              <div className={styles.statLabel}>WEEKLY DUE TASKS <Clock3 size={14} /></div>
              <strong className={styles.statValue}>3 <small>assignments</small></strong>
              <span className={`${styles.statTag} ${styles.redTag}`}>1 urgent due today</span>
            </article>
            <article className={styles.statCard} id="bursar">
              <div className={styles.statLabel}>BURSAR ACCOUNT <Wallet size={14} /></div>
              <strong className={styles.statValue}>$0.00</strong>
              <span className={`${styles.statTag} ${styles.greenTag}`}>Spring holds: clear</span>
            </article>
          </section>

          <section className={styles.announcement}>
            <span className={styles.announcementIcon}><GraduationCap size={17} /></span>
            <div>
              <strong>Spring 2027 Academic Catalog Published <span>OFFICIAL</span></strong>
              <p>Honors and senior standing priority registration opens Monday, Nov 10 at 7:00 AM EST. Schedule your advising check-in before open registration.</p>
            </div>
            <Link href="#advising">Explore catalog <ArrowRight size={14} /></Link>
          </section>

          <section className={styles.primaryGrid}>
            <article className={styles.panel} id="schedule">
              <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                  <span className={`${styles.panelIcon} ${styles.blueIcon}`}><CalendarDays size={16} /></span>
                  <div><h2>Daily academic agenda</h2><p>Friday, October 02 · 3 lectures scheduled</p></div>
                </div>
                <span className={styles.todayTab}>Today</span>
              </div>
              <div className={styles.timeline}>
                <article className={styles.classItem}>
                  <span className={`${styles.timelineDot} ${styles.dotBlue}`} />
                  <div className={styles.classCard}>
                    <div className={styles.classTopline}><span className={styles.courseCode}>CS 301</span><span className={styles.classBadge}>Turing Hall 304</span><span className={styles.liveBadge}>Live in 25m</span><time>10:00 AM – 11:30 AM</time></div>
                    <h3>Distributed Systems &amp; Cloud Infrastructure</h3><p>Prof. Marcus Sterling · Session: Byzantine Fault Tolerance</p>
                    <div className={styles.classActions}><span><Clock3 size={12} /> Wayfinding</span><span><BookOpen size={12} /> Deck #14</span></div>
                  </div>
                </article>
                <article className={styles.classItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.classCard}>
                    <div className={styles.classTopline}><span className={styles.courseCode}>MATH 245</span><span className={styles.classBadge}>Lovelace Science 112</span><span className={styles.classBadge}>In 3h 40m</span><time>1:15 PM – 2:45 PM</time></div>
                    <h3>Linear Algebra &amp; Matrix Computing</h3><p>Prof. Ananya Roy · Problem Set 4 · Interactive walk-through</p>
                    <div className={styles.classActions}><span><NotebookTabs size={12} /> Problem Set 4.pdf</span></div>
                  </div>
                </article>
                <article className={styles.classItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.classCard}>
                    <div className={styles.classTopline}><span className={styles.courseCode}>PHIL 120</span><span className={styles.classBadge}>Humanities Hall 102</span><span className={`${styles.classBadge} ${styles.goldBadge}`}>Special colloquium</span><time>4:00 PM – 5:15 PM</time></div>
                    <h3>Ethics in Artificial Intelligence</h3><p>Dr. Julian Thorne · Hybrid recording available</p>
                    <div className={styles.classActions}><span><ArrowUpRight size={12} /> Hybrid recording</span></div>
                  </div>
                </article>
              </div>
              <Link className={styles.panelLink} href="#courses">Open full schedule <ArrowRight size={14} /></Link>
            </article>

            <article className={styles.panel} id="assignments">
              <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                  <span className={`${styles.panelIcon} ${styles.redIcon}`}><CheckCircle2 size={16} /></span>
                  <div><h2>Pending submissions</h2><p>Due across your 5 enrolled courses</p></div>
                </div>
                <span className={styles.duePill}>3 due soon</span>
              </div>
              <div className={styles.assignmentList}>
                {assignments.map((assignment) => (
                  <article className={`${styles.assignment} ${assignment.urgent ? styles.urgentAssignment : ""}`} key={assignment.title}>
                    <strong className={assignment.urgent ? styles.urgentDue : styles.assignmentDue}>{assignment.due}</strong>
                    <div className={styles.assignmentTitle}><h3>{assignment.title}</h3><span>{assignment.urgent ? "Draft saved" : "Not started"}</span></div>
                    <p>{assignment.course}</p>
                    <div className={styles.assignmentBottom}><span>{assignment.detail}</span><Link href="#courses">{assignment.action}</Link></div>
                  </article>
                ))}
              </div>
              <Link className={styles.panelLink} href="#courses">View all 12 assignments <ArrowRight size={14} /></Link>
            </article>
          </section>

          <section className={styles.courseSection} id="courses">
            <div className={styles.sectionHeading}>
              <div><h2>Enrolled term courses</h2><span className={styles.courseCount}>5 classes</span></div>
              <Link href="#schedule">Semester syllabus repository <ArrowUpRight size={13} /></Link>
            </div>
            <div className={styles.courseGrid} id="grades">
              {courses.map((course) => (
                <article className={styles.courseCard} key={course.code}>
                  <div className={styles.courseCardTop}><span className={styles.courseCode}>{course.code}</span><strong className={`${styles.grade} ${styles[course.tone]}`}>{course.grade} <small>({course.score})</small></strong></div>
                  <h3>{course.name}</h3><p>{course.instructor} · {course.units}</p>
                  <div className={styles.courseProgressLabel}><span>Lecture attendance</span><strong>{course.attendance}%</strong></div>
                  <div className={styles.progressTrack}><span className={`${styles.courseProgress} ${styles[`progress${course.tone}`]}`} style={{ width: `${course.attendance}%` }} /></div>
                  <div className={styles.courseFooter}><span>Syllabus · Discussions</span><Link href="#assignments">Grades <ArrowRight size={12} /></Link></div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.supportGrid}>
            <article className={styles.panel} id="advising">
              <div className={styles.panelHeader}>
                <div className={styles.panelTitle}><span className={`${styles.panelIcon} ${styles.blueIcon}`}><GraduationCap size={16} /></span><div><h2>Academic advising network</h2><p>Faculty mentor &amp; departmental support</p></div></div>
                <span className={styles.cohortPill}>CS honors cohort</span>
              </div>
              <div className={styles.appointment}>
                <span className={styles.advisorPortrait}>SJ</span>
                <div className={styles.appointmentInfo}><span>NEXT CONFIRMED APPOINTMENT</span><strong>Spring &apos;27 Registration Audit</strong><small>Dr. Sarah Jenkins · Monday, Nov 3 · 2:00 PM – 2:30 PM</small></div>
                <Link href="#advising">Join room</Link>
              </div>
              <div className={styles.advisingDetails}>
                <div><ShieldCheck size={15} /><span><small>Capstone track</small>AI systems specialization approved</span></div>
                <div><CalendarDays size={15} /><span><small>Graduation target</small>May 2027 · On track</span></div>
              </div>
              <Link className={styles.panelLink} href="#advising">Schedule additional office hours <ArrowRight size={14} /></Link>
            </article>

            <article className={styles.panel} id="campus-services">
              <div className={styles.panelHeader}>
                <div className={styles.panelTitle}><span className={`${styles.panelIcon} ${styles.tealIcon}`}><MapPin size={16} /></span><div><h2>Campus pulse &amp; quick services</h2><p>Real-time utilities for campus daily life</p></div></div>
              </div>
              <div className={styles.serviceGrid}>
                <Link className={styles.service} href="#campus-services"><span><MapPin size={15} /></span><strong>Campus transit</strong><small>Blue Loop in 3 min at North Quad</small></Link>
                <Link className={styles.service} href="#campus-services"><span><Utensils size={15} /></span><strong>Dining menus</strong><small>Piedmont Hall · Lunch open</small></Link>
                <Link className={styles.service} id="library" href="#library"><span><LibraryBig size={15} /></span><strong>Library study pods</strong><small>Reserve Pod 4F-West</small></Link>
                <Link className={styles.service} href="#campus-services"><span><Settings2 size={15} /></span><strong>Student health</strong><small>Nurse Line &amp; Wellness Desk</small></Link>
              </div>
              <div className={styles.libraryStatus}><i /><span>Library Main Stacks open until 2:00 AM</span><strong>Live hours</strong></div>
            </article>
          </section>
          <p className={styles.dataDisclaimer}><Sparkles size={13} /> Sample academic data only; live course and campus data are not connected yet.</p>
        </div>
      </div>
    </main>
  );
}
