import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

@Injectable()
export class CoursesService {
  constructor(private readonly database: DatabaseService) {}

  async list() {
    return this.database.client.orm.public.Course.select(
      'id',
      'code',
      'title',
      'description',
      'createdAt',
      'updatedAt',
    )
      .include('curriculumCourses', (curriculum) => curriculum.count())
      .include('offerings', (offerings) => offerings.count())
      .all();
  }

  async getById(id: string) {
    const course = await this.database.client.orm.public.Course.where({ id })
      .select('id', 'code', 'title', 'description', 'createdAt', 'updatedAt')
      .include('curriculumCourses', (curriculum) =>
        curriculum
          .select(
            'id',
            'programId',
            'year',
            'semester',
            'credits',
            'courseType',
          )
          .include('program', (program) =>
            program.select('id', 'name', 'code'),
          ),
      )
      .include('offerings', (offerings) =>
        offerings
          .select('id', 'academicTermId', 'instructorId', 'section', 'capacity')
          .include('academicTerm', (term) =>
            term
              .select('id', 'semester', 'academicYearId')
              .include('academicYear', (year) => year.select('id', 'name')),
          )
          .include('instructor', (instructor) =>
            instructor
              .select('id', 'employeeNumber')
              .include('user', (user) =>
                user.select('id', 'firstName', 'lastName'),
              ),
          ),
      )
      .all()
      .first();

    if (course === null) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async create(dto: CreateCourseDto) {
    const code = dto.code.trim();
    const title = dto.title.trim();
    const description = this.normalizeDescription(dto.description);

    if (!code || !title) {
      throw new BadRequestException('Course code and title are required');
    }

    await this.ensureUniqueCode(code);

    try {
      const course = await this.database.client.orm.public.Course.create({
        code,
        title,
        description,
      });
      return this.getById(course.id);
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  async update(id: string, dto: UpdateCourseDto) {
    const existing = await this.database.client.orm.public.Course.where({ id })
      .all()
      .first();

    if (existing === null) {
      throw new NotFoundException('Course not found');
    }

    const code = dto.code === undefined ? undefined : dto.code.trim();
    const title = dto.title === undefined ? undefined : dto.title.trim();
    const description =
      dto.description === undefined
        ? undefined
        : this.normalizeDescription(dto.description);

    if ((code !== undefined && !code) || (title !== undefined && !title)) {
      throw new BadRequestException('Course code and title cannot be empty');
    }

    if (code !== undefined) {
      await this.ensureUniqueCode(code, id);
    }

    const update: {
      code?: string;
      title?: string;
      description?: string | null;
    } = {};
    if (code !== undefined) update.code = code;
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;

    if (Object.keys(update).length === 0) {
      return this.getById(id);
    }

    try {
      const updated = await this.database.client.orm.public.Course.where({
        id,
      }).update(update);

      if (updated === null) {
        throw new NotFoundException('Course not found');
      }
      return this.getById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'update');
    }
  }

  async remove(id: string) {
    const course = await this.database.client.orm.public.Course.where({ id })
      .select('id')
      .all()
      .first();

    if (course === null) {
      throw new NotFoundException('Course not found');
    }

    const curriculumCourse =
      await this.database.client.orm.public.CurriculumCourse.where({
        courseId: id,
      })
        .select('id')
        .all()
        .first();
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        courseId: id,
      },
    )
      .select('id')
      .all()
      .first();

    if (curriculumCourse !== null || offering !== null) {
      throw new ConflictException(
        'Cannot delete a Course referenced by curriculum or offerings',
      );
    }

    try {
      const removed = await this.database.client.orm.public.Course.where({
        id,
      }).delete();

      if (removed === null) {
        throw new NotFoundException('Course not found');
      }
      return { id: removed.id, code: removed.code, title: removed.title };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'delete');
    }
  }

  private async ensureUniqueCode(
    code: string,
    excludeCourseId?: string,
  ): Promise<void> {
    const existing = await this.database.client.orm.public.Course.where({
      code,
    })
      .select('id')
      .all()
      .first();

    if (existing !== null && existing.id !== excludeCourseId) {
      throw new ConflictException('Course code already exists');
    }
  }

  private normalizeDescription(description?: string | null) {
    if (description == null) return null;
    const normalized = description.trim();
    return normalized.length === 0 ? null : normalized;
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };

    if (databaseError?.code === 'P2002') {
      throw new ConflictException('Course code already exists');
    }
    if (databaseError?.code === 'P2003') {
      if (operation === 'delete') {
        throw new ConflictException(
          'Cannot delete a Course with dependent records',
        );
      }
      throw new BadRequestException(
        'Course references a record that does not exist',
      );
    }
    throw new InternalServerErrorException(`Unable to ${operation} Course`);
  }
}
