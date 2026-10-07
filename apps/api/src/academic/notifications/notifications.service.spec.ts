import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { NotificationsService } from './notifications.service.js';

function createDatabase(seed: Record<string, unknown[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  const names = ['User', 'Notification'];

  for (const name of names) {
    state[name] = ((seed[name] ?? []) as Record<string, unknown>[]).map((row) => ({ ...row }));
  }

  let generatedId = 1;
  const tables = Object.fromEntries(
    Object.entries(state).map(([name, rows]) => [
      name,
      {
        where: (criteria: Record<string, unknown>) => {
          const matches = (row: Record<string, unknown>) =>
            Object.entries(criteria).every(([key, value]) => row[key] === value);

          const query = {
            select: () => query,
            all: () => {
              const results = rows.filter(matches);
              return Object.assign(results, {
                first: async () => results[0] ?? null,
              });
            },
            update: async (values: Record<string, unknown>) => {
              const row = rows.find(matches);
              if (row === undefined) return null;
              Object.assign(row, values);
              return row;
            },
            delete: async () => {
              const index = rows.findIndex(matches);
              return index < 0 ? null : rows.splice(index, 1)[0];
            },
          };
          return query;
        },
        create: async (values: Record<string, unknown>) => {
          const row = { id: `generated-${generatedId++}`, ...values };
          rows.push(row);
          return row;
        },
      },
    ]),
  );

  return {
    database: { client: { orm: { public: tables } } } as unknown as DatabaseService,
    state,
  };
}

const adminUser: UserResponse = {
  id: 'user-admin',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const studentUser: UserResponse = {
  id: 'user-student',
  email: 'student@example.com',
  firstName: 'Student',
  lastName: 'User',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('NotificationsService', () => {
  it('creates notifications only for admins', async () => {
    const { database } = createDatabase({
      User: [adminUser, studentUser],
    });

    const service = new NotificationsService(database);

    await expect(
      service.create(
        { userId: studentUser.id, title: 'Welcome', message: 'Hello there' },
        studentUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('counts only own unread notifications', async () => {
    const { database } = createDatabase({
      User: [adminUser, studentUser],
      Notification: [
        { id: 'n-1', userId: studentUser.id, title: 'A', message: 'Hello', isRead: false },
        { id: 'n-2', userId: studentUser.id, title: 'B', message: 'World', isRead: true },
        { id: 'n-3', userId: adminUser.id, title: 'Admin', message: 'Hidden', isRead: false },
      ],
    });

    const service = new NotificationsService(database);

    await expect(service.getUnreadCount(studentUser)).resolves.toEqual({ count: 1 });
  });

  it('rejects blank notifications titles and messages', async () => {
    const { database } = createDatabase({
      User: [adminUser],
    });

    const service = new NotificationsService(database);

    await expect(
      service.create({ userId: adminUser.id, title: '  ', message: 'Hello' }, adminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
