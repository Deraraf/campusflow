import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import { AcademicYearsModule } from '../academic-years/academic-years.module.js';
import { AcademicTermsController, AcademicTermCurrentController } from './academic-terms.controller';
import { AcademicTermsService } from './academic-terms.service.js';

@Module({
  imports: [DatabaseModule, AcademicYearsModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AcademicTermsController, AcademicTermCurrentController],
  providers: [AcademicTermsService],
  exports: [AcademicTermsService],
})
export class AcademicTermsModule {}
