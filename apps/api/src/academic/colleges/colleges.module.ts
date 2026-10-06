import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module.js';
import { CollegesController } from './colleges.controller.js';
import { CollegesService } from './colleges.service.js';

@Module({
  imports: [DatabaseModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CollegesController],
  providers: [CollegesService],
})
export class CollegesModule {}
