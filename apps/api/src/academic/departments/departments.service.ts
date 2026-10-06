import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly database: DatabaseService) {}

  async list() {
    return this.database.client.orm.public.Department.select(
      'id',
      'name',
      'code',
      'collegeId',
      'headInstructorId',
      'createdAt',
      'updatedAt',
    )
      .include('college', (college) => college.select('id', 'name', 'code'))
      .include('head', (head) =>
        head
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('programs', (programs) => programs.count())
      .include('instructors', (instructors) => instructors.count())
      .all();
  }

  async getById(id: string) {
    const department = await this.database.client.orm.public.Department.where({
      id,
    })
      .select(
        'id',
        'name',
        'code',
        'collegeId',
        'headInstructorId',
        'createdAt',
        'updatedAt',
      )
      .include('college', (college) => college.select('id', 'name', 'code'))
      .include('head', (head) =>
        head
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('programs', (programs) => programs.select('id', 'name', 'code'))
      .include('instructors', (instructors) =>
        instructors
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .all()
      .first();

    if (department === null) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async listByCollege(collegeId: string) {
    await this.ensureCollegeExists(collegeId);

    return this.database.client.orm.public.Department.where({ collegeId })
      .select(
        'id',
        'name',
        'code',
        'collegeId',
        'headInstructorId',
        'createdAt',
        'updatedAt',
      )
      .include('college', (college) => college.select('id', 'name', 'code'))
      .include('head', (head) =>
        head
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('programs', (programs) => programs.count())
      .include('instructors', (instructors) => instructors.count())
      .all();
  }

  async create(dto: CreateDepartmentDto) {
    const name = dto.name.trim();
    const code = dto.code.trim();

    if (!name || !code) {
      throw new BadRequestException('Department name and code are required');
    }

    await this.ensureCollegeExists(dto.collegeId);
    await this.ensureUniqueValues(name, code);

    try {
      const department =
        await this.database.client.orm.public.Department.create({
          name,
          code,
          collegeId: dto.collegeId,
          headInstructorId: null,
        });

      return this.getById(department.id);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.handleDatabaseError(error, 'create');
    }
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const existing = await this.database.client.orm.public.Department.where({
      id,
    })
      .all()
      .first();

    if (existing === null) {
      throw new NotFoundException('Department not found');
    }

    const name = dto.name === undefined ? undefined : dto.name.trim();
    const code = dto.code === undefined ? undefined : dto.code.trim();

    if ((name !== undefined && !name) || (code !== undefined && !code)) {
      throw new BadRequestException('Department name and code cannot be empty');
    }

    await this.ensureUniqueValues(name, code, id);

    if (dto.collegeId !== undefined && dto.collegeId !== existing.collegeId) {
      await this.ensureCollegeExists(dto.collegeId);
    }

    if (
      dto.headInstructorId !== undefined &&
      dto.headInstructorId !== existing.headInstructorId &&
      dto.headInstructorId !== null
    ) {
      const instructor = await this.database.client.orm.public.Instructor.where(
        {
          id: dto.headInstructorId,
        },
      )
        .select('id', 'departmentId')
        .all()
        .first();

      if (instructor === null) {
        throw new BadRequestException(
          'Department Head must be an existing Instructor',
        );
      }

      if (instructor.departmentId !== id) {
        throw new BadRequestException(
          'Department Head must belong to this Department',
        );
      }

      await this.ensureHeadAvailable(
        this.database.client,
        dto.headInstructorId,
        id,
      );
    }

    const update: {
      name?: string;
      code?: string;
      collegeId?: string;
      headInstructorId?: string | null;
    } = {};

    if (name !== undefined) {
      update.name = name;
    }
    if (code !== undefined) {
      update.code = code;
    }
    if (dto.collegeId !== undefined) {
      update.collegeId = dto.collegeId;
    }
    if (dto.headInstructorId !== undefined) {
      update.headInstructorId = dto.headInstructorId;
    }

    try {
      const updated = await this.database.client.orm.public.Department.where({
        id,
      }).update(update);

      if (updated === null) {
        throw new NotFoundException('Department not found');
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
    const department = await this.database.client.orm.public.Department.where({
      id,
    })
      .all()
      .first();

    if (department === null) {
      throw new NotFoundException('Department not found');
    }

    const program = await this.database.client.orm.public.Program.where({
      departmentId: id,
    })
      .select('id')
      .all()
      .first();

    if (program !== null) {
      throw new ConflictException(
        'Cannot delete a Department that has Programs',
      );
    }

    const instructor = await this.database.client.orm.public.Instructor.where({
      departmentId: id,
    })
      .select('id')
      .all()
      .first();

    if (instructor !== null) {
      throw new ConflictException(
        'Cannot delete a Department that has Instructors',
      );
    }

    try {
      const removed = await this.database.client.orm.public.Department.where({
        id,
      }).delete();

      if (removed === null) {
        throw new NotFoundException('Department not found');
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

  private async ensureCollegeExists(collegeId: string): Promise<void> {
    const college = await this.database.client.orm.public.College.where({
      id: collegeId,
    })
      .select('id')
      .all()
      .first();

    if (college === null) {
      throw new NotFoundException('College not found');
    }
  }

  private async ensureUniqueValues(
    name?: string,
    code?: string,
    excludeId?: string,
  ): Promise<void> {
    if (name !== undefined) {
      const departmentWithName =
        await this.database.client.orm.public.Department.where({
          name,
        })
          .select('id')
          .all()
          .first();

      if (departmentWithName !== null && departmentWithName.id !== excludeId) {
        throw new ConflictException('Department name already exists');
      }
    }

    if (code !== undefined) {
      const departmentWithCode =
        await this.database.client.orm.public.Department.where({
          code,
        })
          .select('id')
          .all()
          .first();

      if (departmentWithCode !== null && departmentWithCode.id !== excludeId) {
        throw new ConflictException('Department code already exists');
      }
    }
  }

  private async ensureHeadAvailable(
    client: Pick<DatabaseService['client'], 'orm'>,
    headInstructorId: string,
    excludeDepartmentId?: string,
  ): Promise<void> {
    const departmentWithHead = await client.orm.public.Department.where({
      headInstructorId,
    })
      .select('id')
      .all()
      .first();

    if (
      departmentWithHead !== null &&
      departmentWithHead.id !== excludeDepartmentId
    ) {
      throw new ConflictException(
        'Instructor is already Head of another Department',
      );
    }
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };

    if (databaseError?.code === 'P2002') {
      throw new ConflictException(
        'Department name, code, or Head assignment already exists',
      );
    }

    if (databaseError?.code === 'P2003') {
      if (operation === 'delete') {
        throw new ConflictException(
          'Cannot delete a Department with dependent records',
        );
      }

      throw new BadRequestException(
        'Department references a record that does not exist',
      );
    }

    throw new InternalServerErrorException(`Unable to ${operation} Department`);
  }
}
