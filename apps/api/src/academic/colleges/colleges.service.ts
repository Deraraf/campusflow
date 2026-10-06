import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateCollegeDto } from './dto/create-college.dto.js';
import { UpdateCollegeDto } from './dto/update-college.dto.js';

@Injectable()
export class CollegesService {
  constructor(private readonly database: DatabaseService) {}

  async list() {
    const colleges = await this.database.client.orm.public.College.select(
      'id',
      'name',
      'code',
      'deanId',
      'createdAt',
      'updatedAt',
    )
      .include('dean', (dean) =>
        dean
          .select('id', 'employeeNumber')
          .include('user', (user) => user.select('id', 'firstName', 'lastName')),
      )
      .include('departments', (departments) => departments.count())
      .all();

    return colleges;
  }

  async getById(id: string) {
    const college = await this.database.client.orm.public.College.where({ id })
      .select('id', 'name', 'code', 'deanId', 'createdAt', 'updatedAt')
      .include('dean', (dean) =>
        dean
          .select('id', 'employeeNumber')
          .include('user', (user) => user.select('id', 'firstName', 'lastName')),
      )
      .include('departments', (departments) =>
        departments.select('id', 'name', 'code'),
      )
      .all()
      .first();

    if (college === null) {
      throw new NotFoundException('College not found');
    }

    return college;
  }

  async create(dto: CreateCollegeDto) {
    const name = dto.name.trim();
    const code = dto.code.trim();

    if (!name || !code) {
      throw new BadRequestException('College name and code are required');
    }

    await this.ensureUniqueValues(name, code);
    await this.ensureDeanAvailable(dto.deanId ?? null);

    try {
      const college = await this.database.client.orm.public.College.create({
        name,
        code,
        deanId: dto.deanId ?? null,
      });

      return this.getById(college.id);
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  async update(id: string, dto: UpdateCollegeDto) {
    const existing = await this.database.client.orm.public.College.where({ id })
      .all()
      .first();

    if (existing === null) {
      throw new NotFoundException('College not found');
    }

    const name = dto.name === undefined ? undefined : dto.name.trim();
    const code = dto.code === undefined ? undefined : dto.code.trim();

    if ((name !== undefined && !name) || (code !== undefined && !code)) {
      throw new BadRequestException('College name and code cannot be empty');
    }

    await this.ensureUniqueValues(name, code, id);

    if (dto.deanId !== undefined && dto.deanId !== existing.deanId) {
      await this.ensureDeanAvailable(dto.deanId, id);
    }

    const update: {
      name?: string;
      code?: string;
      deanId?: string | null;
    } = {};

    if (name !== undefined) {
      update.name = name;
    }
    if (code !== undefined) {
      update.code = code;
    }
    if (dto.deanId !== undefined) {
      update.deanId = dto.deanId;
    }

    try {
      const updated = await this.database.client.orm.public.College.where({
        id,
      }).update(update);

      if (updated === null) {
        throw new NotFoundException('College not found');
      }

      return this.getById(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.handleDatabaseError(error, 'update');
    }
  }

  async remove(id: string) {
    const college = await this.database.client.orm.public.College.where({ id })
      .all()
      .first();

    if (college === null) {
      throw new NotFoundException('College not found');
    }

    const department = await this.database.client.orm.public.Department.where({
      collegeId: id,
    })
      .all()
      .first();

    if (department !== null) {
      throw new ConflictException(
        'Cannot delete a college that has departments',
      );
    }

    try {
      const removed = await this.database.client.orm.public.College.where({
        id,
      }).delete();

      if (removed === null) {
        throw new NotFoundException('College not found');
      }

      return {
        id: removed.id,
        name: removed.name,
        code: removed.code,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.handleDatabaseError(error, 'delete');
    }
  }

  private async ensureUniqueValues(
    name?: string,
    code?: string,
    excludeId?: string,
  ): Promise<void> {
    if (name !== undefined) {
      const collegeWithName = await this.database.client.orm.public.College.where({
        name,
      })
        .all()
        .first();

      if (collegeWithName !== null && collegeWithName.id !== excludeId) {
        throw new ConflictException('College name already exists');
      }
    }

    if (code !== undefined) {
      const collegeWithCode = await this.database.client.orm.public.College.where({
        code,
      })
        .all()
        .first();

      if (collegeWithCode !== null && collegeWithCode.id !== excludeId) {
        throw new ConflictException('College code already exists');
      }
    }
  }

  private async ensureDeanAvailable(
    deanId: string | null | undefined,
    excludeCollegeId?: string,
  ): Promise<void> {
    if (deanId == null) {
      return;
    }

    const instructor = await this.database.client.orm.public.Instructor.where({
      id: deanId,
    })
      .select('id')
      .all()
      .first();

    if (instructor === null) {
      throw new BadRequestException('Selected Dean must be an existing Instructor');
    }

    const assignedCollege = await this.database.client.orm.public.College.where({
      deanId,
    })
      .all()
      .first();

    if (
      assignedCollege !== null &&
      assignedCollege.id !== excludeCollegeId
    ) {
      throw new ConflictException(
        'Selected Instructor is already Dean of another college',
      );
    }
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };

    if (databaseError?.code === 'P2002') {
      throw new ConflictException('College name, code, or Dean assignment already exists');
    }

    if (databaseError?.code === 'P2003') {
      throw new ConflictException(
        operation === 'delete'
          ? 'Cannot delete a college with dependent records'
          : 'College references a record that does not exist',
      );
    }

    throw new InternalServerErrorException(`Unable to ${operation} college`);
  }
}
