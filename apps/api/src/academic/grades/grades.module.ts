import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import {
  EnrollmentsGradesController,
  GradesController,
  StudentGradesController,
} from './grades.controller.js';
import { GradesService } from './grades.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    GradesController,
    EnrollmentsGradesController,
    StudentGradesController,
  ],
  providers: [GradesService],
})
export class GradesModule {}
