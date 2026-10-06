import { Module } from '@nestjs/common';
import { AcademicTermsModule } from './academic-terms/academic-terms.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { CollegesModule } from './colleges/colleges.module'; // Corrected import path

@Module({
  imports: [AcademicYearsModule, AcademicTermsModule, CollegesModule],
})
export class AcademicModule {}
