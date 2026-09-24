import { Injectable } from '@nestjs/common';
import { db } from '@campusflow/database';

@Injectable()
export class DatabaseService {
  get client(): typeof db {
    return db;
  }

  async onModuleInit() {
    await db.connect();
  }

  async onModuleDestroy() {
    await db.close();
  }
}
