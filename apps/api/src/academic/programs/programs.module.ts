import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import {
  CurriculumController,
  DepartmentProgramsController,
  ProgramsController,
} from './programs.controller.js';
import { CurriculumService } from './curriculum.service.js';
import { ProgramsService } from './programs.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    ProgramsController,
    DepartmentProgramsController,
    CurriculumController,
  ],
  providers: [ProgramsService, CurriculumService],
})
export class ProgramsModule {}
