import { Module } from '@nestjs/common';
import { AcademicTermsModule } from './academic-terms/academic-terms.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';

@Module({
  imports: [AcademicYearsModule, AcademicTermsModule],
})
export class AcademicModule {}
