import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { ConversationsService } from './conversations.service.js';

function createDatabase(seed: Record<string, unknown[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  const names = ['User', 'Conversation', 'Message'];

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

const studentUser: UserResponse = {
  id: 'user-1',
  email: 'student@example.com',
  firstName: 'Student',
  lastName: 'User',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const otherUser: UserResponse = {
  id: 'user-2',
  email: 'other@example.com',
  firstName: 'Other',
  lastName: 'User',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('ConversationsService', () => {
  it('creates a conversation for the authenticated user', async () => {
    const { database } = createDatabase({
      User: [studentUser],
    });

    const service = new ConversationsService(database);

    await expect(
      service.create({ title: 'Topic' }, studentUser),
    ).resolves.toMatchObject({ userId: studentUser.id, title: 'Topic' });
  });

  it('rejects client-created assistant messages', async () => {
    const { database } = createDatabase({
      User: [studentUser],
      Conversation: [{ id: 'conv-1', userId: studentUser.id, title: 'Topic' }],
    });

    const service = new ConversationsService(database);

    await expect(
      service.createMessage('conv-1', { role: 'ASSISTANT' as any, content: 'Hi' }, studentUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks access to another user conversation', async () => {
    const { database } = createDatabase({
      User: [studentUser, otherUser],
      Conversation: [{ id: 'conv-1', userId: studentUser.id, title: 'Topic' }],
    });

    const service = new ConversationsService(database);

    await expect(service.getById('conv-1', otherUser)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
