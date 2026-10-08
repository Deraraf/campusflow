import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { UpdateInstructorDto } from './dto/update-instructor.dto.js';

@Injectable()
export class InstructorsService {
  constructor(private readonly database: DatabaseService) {}

  async list() {
    return this.database.client.orm.public.Instructor.select(
      'id',
      'userId',
      'employeeNumber',
      'departmentId',
      'createdAt',
      'updatedAt',
    )
      .include('user', (user) =>
        user.select('id', 'firstName', 'lastName', 'email', 'role', 'status'),
      )
      .include('department', (department) =>
        department.select('id', 'name', 'code').include('college', (college) =>
          college.select('id', 'name', 'code'),
        ),
      )
      .all();
  }

  async getById(id: string) {
    const instructor = await this.database.client.orm.public.Instructor.where({
      id,
    })
      .select('id', 'userId', 'employeeNumber', 'departmentId', 'createdAt', 'updatedAt')
      .include('user', (user) =>
        user.select('id', 'firstName', 'lastName', 'email', 'role', 'status'),
      )
      .include('department', (department) =>
        department.select('id', 'name', 'code').include('college', (college) =>
          college.select('id', 'name', 'code'),
        ),
      )
      .all()
      .first();

    if (instructor === null) {
      throw new NotFoundException('Instructor not found');
    }

    return instructor;
  }

  async listByDepartment(departmentId: string) {
    const department = await this.database.client.orm.public.Department.where({
      id: departmentId,
    })
      .select('id')
      .all()
      .first();

    if (department === null) {
      throw new NotFoundException('Department not found');
    }

    return this.database.client.orm.public.Instructor.where({ departmentId })
      .select('id', 'userId', 'employeeNumber', 'departmentId', 'createdAt', 'updatedAt')
      .include('user', (user) =>
        user.select('id', 'firstName', 'lastName', 'email', 'role', 'status'),
      )
      .all();
  }

  async update(id: string, dto: UpdateInstructorDto) {
    const existing = await this.database.client.orm.public.Instructor.where({ id })
      .all()
      .first();

    if (existing === null) {
      throw new NotFoundException('Instructor not found');
    }

    const employeeNumber =
      dto.employeeNumber === undefined ? undefined : dto.employeeNumber.trim();
    const departmentId = dto.departmentId;

    if (employeeNumber !== undefined && !employeeNumber) {
      throw new BadRequestException('employeeNumber cannot be empty');
    }

    if (departmentId !== undefined) {
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

    if (employeeNumber !== undefined) {
      const duplicate = await this.database.client.orm.public.Instructor.where({
        employeeNumber,
      })
        .select('id')
        .all()
        .first();

      if (duplicate !== null && duplicate.id !== id) {
        throw new ConflictException('Employee number already exists');
      }
    }

    const updateValues: { employeeNumber?: string; departmentId?: string } = {};
    if (employeeNumber !== undefined) {
      updateValues.employeeNumber = employeeNumber;
    }
    if (departmentId !== undefined) {
      updateValues.departmentId = departmentId;
    }

    const updated = await this.database.client.orm.public.Instructor.where({ id }).update(
      updateValues,
    );

    if (updated === null) {
      throw new NotFoundException('Instructor not found');
    }

    return this.getById(id);
  }
}
