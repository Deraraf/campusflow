import { Module } from '@nestjs/common';
import { AcademicTermsModule } from './academic-terms/academic-terms.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { CollegesModule } from './colleges/colleges.module'; // Corrected import path
import { DepartmentsModule } from './departments/departments.module.js';
import { ProgramsModule } from './programs/programs.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { CourseOfferingsModule } from './course-offerings/course-offerings.module.js';
import { StudentApplicationsModule } from './student-applications/student-applications.module.js';
import { StudentsModule } from './students/students.module.js';
import { StudentAcademicStandingsModule } from './student-academic-standings/student-academic-standings.module.js';
import { EnrollmentsModule } from './enrollments/enrollments.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';
import { SubmissionsModule } from './submissions/submissions.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';

@Module({
  imports: [
    AcademicYearsModule,
    AcademicTermsModule,
    CollegesModule,
    DepartmentsModule,
    ProgramsModule,
    CoursesModule,
    CourseOfferingsModule,
    StudentApplicationsModule,
    StudentsModule,
    StudentAcademicStandingsModule,
    EnrollmentsModule,
    AssignmentsModule,
    SubmissionsModule,
    AttendanceModule,
    NotificationsModule,
    ConversationsModule,
  ],
})
export class AcademicModule {}
