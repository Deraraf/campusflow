import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AuthTokenRecord,
  UserCredentials,
  UserResponse,
} from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(): Promise<UserResponse[]> {
    const users = await this.database.client.orm.public.User.all();

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  async findOne(id: string): Promise<UserResponse | null> {
    const user = await this.database.client.orm.public.User.where({ id })
      .all()
      .first();

    return user === null ? null : this.toResponse(user);
  }

  async findOneForAuth(id: string): Promise<UserCredentials | null> {
    const user = await this.database.client.orm.public.User.where({ id })
      .all()
      .first();

    return user === null ? null : this.toCredentials(user);
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    const user = await this.database.client.orm.public.User.where({ email })
      .all()
      .first();

    return user === null ? null : this.toResponse(user);
  }

  async findByEmailForAuth(email: string): Promise<UserCredentials | null> {
    const user = await this.database.client.orm.public.User.where({ email })
      .all()
      .first();

    return user === null ? null : this.toCredentials(user);
  }

  async createWithPasswordHash(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<UserCredentials> {
    const user = await this.database.client.orm.public.User.create({
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    return this.toCredentials(user);
  }

  async createEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    await this.database.client.orm.public.EmailVerificationToken.create(data);
  }

  async refreshEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<AuthTokenRecord | null> {
    const token = await this.findEmailVerificationTokenByUserId(data.userId);

    if (token === null) {
      const created =
        await this.database.client.orm.public.EmailVerificationToken.create({
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        });

      return {
        id: created.id,
        userId: created.userId,
        tokenHash: created.tokenHash,
        expiresAt: created.expiresAt,
        usedAt: created.usedAt,
        createdAt: created.createdAt,
      };
    }

    const refreshedToken =
      await this.database.client.orm.public.EmailVerificationToken.where({
        id: token.id,
      }).update({
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: null,
      });

    if (refreshedToken === null) {
      return null;
    }

    return {
      id: refreshedToken.id,
      userId: refreshedToken.userId,
      tokenHash: refreshedToken.tokenHash,
      expiresAt: refreshedToken.expiresAt,
      usedAt: refreshedToken.usedAt,
      createdAt: refreshedToken.createdAt,
    };
  }

  async findEmailVerificationTokenByUserId(
    userId: string,
  ): Promise<AuthTokenRecord | null> {
    const token =
      await this.database.client.orm.public.EmailVerificationToken.where({
        userId,
      })
        .all()
        .first();

    if (token === null) {
      return null;
    }

    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    };
  }

  async findEmailVerificationToken(
    tokenHash: string,
  ): Promise<AuthTokenRecord | null> {
    const token =
      await this.database.client.orm.public.EmailVerificationToken.where({
        tokenHash,
      })
        .all()
        .first();

    return token === null ? null : this.toEmailVerificationToken(token);
  }

  async activateUserFromEmailVerification(
    userId: string,
  ): Promise<UserResponse | null> {
    const user = await this.database.client.orm.public.User.where({
      id: userId,
      status: 'PENDING_VERIFICATION',
      emailVerifiedAt: null,
    }).update({
      status: 'ACTIVE',
      emailVerifiedAt: new Date().toISOString(),
    });

    return user === null ? null : this.toResponse(user);
  }

  async refreshPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<AuthTokenRecord | null> {
    const token = await this.findPasswordResetTokenByUserId(data.userId);

    if (token === null) {
      const created = await this.database.client.orm.public.PasswordResetToken.create({
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      });

      return {
        id: created.id,
        userId: created.userId,
        tokenHash: created.tokenHash,
        expiresAt: created.expiresAt,
        usedAt: created.usedAt,
        createdAt: created.createdAt,
      };
    }

    const refreshedToken =
      await this.database.client.orm.public.PasswordResetToken.where({
        id: token.id,
      }).update({
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: null,
      });

    if (refreshedToken === null) {
      return null;
    }

    return {
      id: refreshedToken.id,
      userId: refreshedToken.userId,
      tokenHash: refreshedToken.tokenHash,
      expiresAt: refreshedToken.expiresAt,
      usedAt: refreshedToken.usedAt,
      createdAt: refreshedToken.createdAt,
    };
  }

  async findPasswordResetTokenByUserId(
    userId: string,
  ): Promise<AuthTokenRecord | null> {
    const token =
      await this.database.client.orm.public.PasswordResetToken.where({
        userId,
      })
        .all()
        .first();

    return token === null ? null : this.toEmailVerificationToken(token);
  }

  async findPasswordResetToken(
    tokenHash: string,
  ): Promise<AuthTokenRecord | null> {
    const token =
      await this.database.client.orm.public.PasswordResetToken.where({
        tokenHash,
      })
        .all()
        .first();

    return token === null ? null : this.toEmailVerificationToken(token);
  }

  async resetPasswordWithToken(data: {
    tokenId: string;
    userId: string;
    passwordHash: string;
  }): Promise<boolean> {
    return this.database.client.transaction(async (tx) => {
      const token = await tx.orm.public.PasswordResetToken.where({
        id: data.tokenId,
        userId: data.userId,
        usedAt: null,
      })
        .all()
        .first();

      if (
        token === null ||
        new Date(token.expiresAt).getTime() <= Date.now()
      ) {
        return false;
      }

      const consumedToken =
        await tx.orm.public.PasswordResetToken.where({
          id: data.tokenId,
          userId: data.userId,
          usedAt: null,
        }).update({
          usedAt: new Date().toISOString(),
        });

      if (consumedToken === null) {
        return false;
      }

      const user = await tx.orm.public.User.where({
        id: data.userId,
      }).update({
        passwordHash: data.passwordHash,
        sessionVersion: randomUUID(),
      });

      if (user === null) {
        throw new Error('Unable to update the user password');
      }

      return true;
    });
  }

  async consumeEmailVerificationToken(tokenId: string): Promise<boolean> {
    const token =
      await this.database.client.orm.public.EmailVerificationToken.where({
        id: tokenId,
        usedAt: null,
      }).update({
        usedAt: new Date().toISOString(),
      });

    return token !== null;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse | null> {
    const user = await this.database.client.orm.public.User.where({
      id,
    }).update({
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      email: updateUserDto.email,
    });

    return user === null ? null : this.toResponse(user);
  }

  async deleteEmailVerificationTokensByUserId(userId: string): Promise<void> {
    await this.database.client.orm.public.EmailVerificationToken.where({
      userId,
    }).delete();
  }

  async deletePasswordResetTokensByUserId(userId: string): Promise<void> {
    await this.database.client.orm.public.PasswordResetToken.where({
      userId,
    }).delete();
  }

  async remove(id: string): Promise<UserResponse | null> {
    await this.deleteEmailVerificationTokensByUserId(id);
    await this.deletePasswordResetTokensByUserId(id);
    const user = await this.database.client.orm.public.User.where({
      id,
    }).delete();

    return user === null ? null : this.toResponse(user);
  }

  private toResponse(user: UserResponse): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toCredentials(user: UserCredentials): UserCredentials {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      sessionVersion: user.sessionVersion,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toEmailVerificationToken(
    token: AuthTokenRecord,
  ): AuthTokenRecord {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    };
  }
}
