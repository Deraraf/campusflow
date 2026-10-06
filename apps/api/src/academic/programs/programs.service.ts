import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import {
  MAX_PROGRAM_DURATION_YEARS,
  MIN_PROGRAM_DURATION_YEARS,
} from './dto/create-program.dto.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';

@Injectable()
export class ProgramsService {
  constructor(private readonly database: DatabaseService) {}

  async list() {
    return this.database.client.orm.public.Program.select(
      'id',
      'name',
      'code',
      'departmentId',
      'durationYears',
      'coordinatorInstructorId',
      'createdAt',
      'updatedAt',
    )
      .include('department', (department) =>
        department.select('id', 'name', 'code'),
      )
      .include('coordinator', (coordinator) =>
        coordinator
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('curriculumCourses', (curriculum) => curriculum.count())
      .include('students', (students) => students.count())
      .all();
  }

  async getById(id: string) {
    const program = await this.database.client.orm.public.Program.where({ id })
      .select(
        'id',
        'name',
        'code',
        'departmentId',
        'durationYears',
        'coordinatorInstructorId',
        'createdAt',
        'updatedAt',
      )
      .include('department', (department) =>
        department.select('id', 'name', 'code'),
      )
      .include('coordinator', (coordinator) =>
        coordinator
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('curriculumCourses', (curriculum) =>
        curriculum
          .select(
            'id',
            'year',
            'semester',
            'credits',
            'courseType',
            'isRequired',
          )
          .include('course', (course) => course.select('id', 'code', 'title')),
      )
      .include('students', (students) => students.count())
      .all()
      .first();

    if (program === null) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async listByDepartment(departmentId: string) {
    await this.ensureDepartmentExists(departmentId);

    return this.database.client.orm.public.Program.where({ departmentId })
      .select(
        'id',
        'name',
        'code',
        'departmentId',
        'durationYears',
        'coordinatorInstructorId',
        'createdAt',
        'updatedAt',
      )
      .include('department', (department) =>
        department.select('id', 'name', 'code'),
      )
      .include('coordinator', (coordinator) =>
        coordinator
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('curriculumCourses', (curriculum) => curriculum.count())
      .include('students', (students) => students.count())
      .all();
  }

  async create(dto: CreateProgramDto) {
    const name = dto.name.trim();
    const code = dto.code.trim();

    if (!name || !code) {
      throw new BadRequestException('Program name and code are required');
    }

    this.validateDuration(dto.durationYears);
    await this.ensureDepartmentExists(dto.departmentId);
    await this.ensureUniqueCode(code);

    try {
      const program = await this.database.client.orm.public.Program.create({
        name,
        code,
        departmentId: dto.departmentId,
        durationYears: dto.durationYears,
        coordinatorInstructorId: null,
      });

      return this.getById(program.id);
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  async update(id: string, dto: UpdateProgramDto) {
    const existing = await this.database.client.orm.public.Program.where({ id })
      .all()
      .first();

    if (existing === null) {
      throw new NotFoundException('Program not found');
    }

    const name = dto.name === undefined ? undefined : dto.name.trim();
    const code = dto.code === undefined ? undefined : dto.code.trim();
    const departmentId = dto.departmentId ?? existing.departmentId;
    const departmentChanged = departmentId !== existing.departmentId;

    if ((name !== undefined && !name) || (code !== undefined && !code)) {
      throw new BadRequestException('Program name and code cannot be empty');
    }

    if (dto.durationYears !== undefined) {
      this.validateDuration(dto.durationYears);

      const curriculumCourses =
        await this.database.client.orm.public.CurriculumCourse.where({
          programId: id,
        }).all();

      if (
        curriculumCourses.some(
          (curriculum) => curriculum.year > dto.durationYears!,
        )
      ) {
        throw new BadRequestException(
          'Program durationYears cannot be shorter than an existing curriculum year',
        );
      }
    }

    if (departmentChanged) {
      await this.ensureDepartmentExists(departmentId);

      if (
        existing.coordinatorInstructorId !== null &&
        dto.coordinatorInstructorId === undefined
      ) {
        throw new BadRequestException(
          'Changing the Department requires clearing or replacing the Program Coordinator in the same request',
        );
      }
    }

    const coordinatorInstructorId = dto.coordinatorInstructorId;
    if (
      coordinatorInstructorId !== undefined &&
      coordinatorInstructorId !== null
    ) {
      await this.ensureCoordinator(coordinatorInstructorId, departmentId, id);
    }

    await this.ensureUniqueCode(code, id);

    const update: {
      name?: string;
      code?: string;
      departmentId?: string;
      durationYears?: number;
      coordinatorInstructorId?: string | null;
    } = {};

    if (name !== undefined) update.name = name;
    if (code !== undefined) update.code = code;
    if (dto.departmentId !== undefined) update.departmentId = departmentId;
    if (dto.durationYears !== undefined)
      update.durationYears = dto.durationYears;
    if (coordinatorInstructorId !== undefined) {
      update.coordinatorInstructorId = coordinatorInstructorId;
    }

    try {
      const updated = await this.database.client.orm.public.Program.where({
        id,
      }).update(update);

      if (updated === null) {
        throw new NotFoundException('Program not found');
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
    const existing = await this.database.client.orm.public.Program.where({ id })
      .select('id')
      .all()
      .first();

    if (existing === null) {
      throw new NotFoundException('Program not found');
    }

    const curriculumCourse =
      await this.database.client.orm.public.CurriculumCourse.where({
        programId: id,
      })
        .select('id')
        .all()
        .first();
    const student = await this.database.client.orm.public.Student.where({
      programId: id,
    })
      .select('id')
      .all()
      .first();
    const application =
      await this.database.client.orm.public.StudentApplication.where({
        programId: id,
      })
        .select('id')
        .all()
        .first();

    if (curriculumCourse !== null || student !== null || application !== null) {
      throw new ConflictException(
        'Cannot delete a Program with curriculum courses, students, or applications',
      );
    }

    try {
      const removed = await this.database.client.orm.public.Program.where({
        id,
      }).delete();

      if (removed === null) {
        throw new NotFoundException('Program not found');
      }

      return { id: removed.id, name: removed.name, code: removed.code };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handleDatabaseError(error, 'delete');
    }
  }

  private async ensureDepartmentExists(departmentId: string): Promise<void> {
    const department = await this.database.client.orm.public.Department.where({
      id: departmentId,
    })
      .select('id')
      .all()
      .first();

    if (department === null) {
      throw new NotFoundException('Department not found');
    }
  }

  private async ensureCoordinator(
    instructorId: string,
    departmentId: string,
    excludeProgramId: string,
  ): Promise<void> {
    const instructor = await this.database.client.orm.public.Instructor.where({
      id: instructorId,
    })
      .select('id', 'departmentId')
      .all()
      .first();

    if (instructor === null) {
      throw new BadRequestException(
        'Program Coordinator must be an existing Instructor',
      );
    }

    if (instructor.departmentId !== departmentId) {
      throw new BadRequestException(
        'Program Coordinator must belong to the Program Department',
      );
    }

    const coordinatedProgram =
      await this.database.client.orm.public.Program.where({
        coordinatorInstructorId: instructorId,
      })
        .select('id')
        .all()
        .first();

    if (
      coordinatedProgram !== null &&
      coordinatedProgram.id !== excludeProgramId
    ) {
      throw new ConflictException(
        'Instructor is already Coordinator of another Program',
      );
    }
  }

  private validateDuration(durationYears: number): void {
    if (
      !Number.isInteger(durationYears) ||
      durationYears < MIN_PROGRAM_DURATION_YEARS ||
      durationYears > MAX_PROGRAM_DURATION_YEARS
    ) {
      throw new BadRequestException(
        `durationYears must be an integer from ${MIN_PROGRAM_DURATION_YEARS} to ${MAX_PROGRAM_DURATION_YEARS}`,
      );
    }
  }

  private async ensureUniqueCode(
    code?: string,
    excludeProgramId?: string,
  ): Promise<void> {
    if (code === undefined) return;

    const program = await this.database.client.orm.public.Program.where({
      code,
    })
      .select('id')
      .all()
      .first();

    if (program !== null && program.id !== excludeProgramId) {
      throw new ConflictException('Program code already exists');
    }
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };

    if (databaseError?.code === 'P2002') {
      throw new ConflictException(
        'Program code or Coordinator assignment already exists',
      );
    }

    if (databaseError?.code === 'P2003') {
      if (operation === 'delete') {
        throw new ConflictException(
          'Cannot delete a Program with dependent records',
        );
      }
      throw new BadRequestException(
        'Program references a record that does not exist',
      );
    }

    throw new InternalServerErrorException(`Unable to ${operation} Program`);
  }
}
