import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import { StudentApplicationsController } from './student-applications.controller.js';
import { StudentApplicationsService } from './student-applications.service.js';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [StudentApplicationsController],
  providers: [StudentApplicationsService],
})
export class StudentApplicationsModule {}
