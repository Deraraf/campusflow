import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class StudentsService {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<unknown[]> {
    const students = await this.database.client.orm.public.Student.select(
      'id',
      'studentNumber',
      'userId',
      'programId',
      'admissionAcademicYearId',
      'status',
      'createdAt',
      'updatedAt',
    )
      .include('user', (user) =>
        user.select('id', 'firstName', 'lastName', 'email'),
      )
      .include('program', (program) =>
        program
          .select('id', 'name', 'code', 'durationYears')
          .include('department', (department) =>
            department.select('id', 'name', 'code'),
          ),
      )
      .include('admissionAcademicYear', (year) =>
        year.select('id', 'name', 'startDate', 'endDate'),
      )
      .all();

    const currentTerm =
      await this.database.client.orm.public.AcademicTerm.where({
        isCurrent: true,
      })
        .select('id')
        .all()
        .first();

    const currentStandings =
      currentTerm === null
        ? []
        : await this.database.client.orm.public.StudentAcademicStanding.where({
            academicTermId: currentTerm.id,
          })
            .select('studentId', 'academicTermId', 'programYear')
            .all();
    const standingByStudent = new Map(
      currentStandings.map((standing) => [standing.studentId, standing]),
    );

    return students.map((student) => ({
      ...student,
      currentAcademicStanding: standingByStudent.get(student.id) ?? null,
    }));
  }

  async getById(id: string): Promise<unknown> {
    const student = await this.database.client.orm.public.Student.where({ id })
      .select(
        'id',
        'studentNumber',
        'userId',
        'programId',
        'admissionAcademicYearId',
        'status',
        'createdAt',
        'updatedAt',
      )
      .include('user', (user) =>
        user.select('id', 'firstName', 'lastName', 'email'),
      )
      .include('program', (program) =>
        program
          .select('id', 'name', 'code', 'durationYears')
          .include('department', (department) =>
            department.select('id', 'name', 'code'),
          ),
      )
      .include('admissionAcademicYear', (year) =>
        year.select('id', 'name', 'startDate', 'endDate'),
      )
      .include('academicStandings', (standing) =>
        standing
          .select('id', 'academicTermId', 'programYear', 'createdAt')
          .include('academicTerm', (term) =>
            term
              .select('id', 'semester', 'academicYearId')
              .include('academicYear', (year) => year.select('id', 'name')),
          ),
      )
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  async getMine(userId: string): Promise<unknown> {
    const student = await this.database.client.orm.public.Student.where({
      userId,
    })
      .select('id')
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('No Student record exists for this account');
    }
    return this.getById(student.id);
  }

  async updateStatus(id: string, status: string): Promise<unknown> {
    const student = await this.database.client.orm.public.Student.where({ id })
      .select('id')
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('Student not found');
    }

    const updated = await this.database.client.orm.public.Student.where({
      id,
    }).update({
      status: status as 'ACTIVE' | 'SUSPENDED' | 'GRADUATED' | 'WITHDRAWN',
    });

    if (updated === null) {
      throw new NotFoundException('Student not found');
    }
    return this.getById(id);
  }
}
