import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly database: DatabaseService) {}

  getHello(): string {
    return 'CampusFlow API is running';
  }

  getDatabaseStatus(): string {
    return this.database.client ? 'Database connected' : 'Database unavailable';
  }
}
