import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import {
  AssignmentsController,
  CourseOfferingsAssignmentsController,
} from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AssignmentsController, CourseOfferingsAssignmentsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
