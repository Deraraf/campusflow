import { Module } from '@nestjs/common';
import { AcademicTermsModule } from './academic-terms/academic-terms.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { CollegesModule } from './colleges/colleges.module'; // Corrected import path
import { DepartmentsModule } from './departments/departments.module.js';
import { ProgramsModule } from './programs/programs.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { CourseOfferingsModule } from './course-offerings/course-offerings.module.js';

@Module({
  imports: [
    AcademicYearsModule,
    AcademicTermsModule,
    CollegesModule,
    DepartmentsModule,
    ProgramsModule,
    CoursesModule,
    CourseOfferingsModule,
  ],
})
export class AcademicModule {}
