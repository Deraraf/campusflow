import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  EmailVerificationTokenRecord,
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
  }): Promise<EmailVerificationTokenRecord | null> {
    const token = await this.findEmailVerificationTokenByUserId(data.userId);

    if (token === null) {
      return null;
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
  ): Promise<EmailVerificationTokenRecord | null> {
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
  ): Promise<EmailVerificationTokenRecord | null> {
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

  async remove(id: string): Promise<UserResponse | null> {
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
    token: EmailVerificationTokenRecord,
  ): EmailVerificationTokenRecord {
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
