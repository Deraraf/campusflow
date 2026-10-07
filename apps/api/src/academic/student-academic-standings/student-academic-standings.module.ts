import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import { StudentAcademicStandingsController } from './student-academic-standings.controller.js';
import { StudentAcademicStandingsService } from './student-academic-standings.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [StudentAcademicStandingsController],
  providers: [StudentAcademicStandingsService],
})
export class StudentAcademicStandingsModule {}
