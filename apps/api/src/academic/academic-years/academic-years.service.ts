import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto.js';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto.js';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<AcademicYearRecord[]> {
    return this.database.client.orm.public.AcademicYear.all();
  }

  async getCurrent(): Promise<AcademicYearRecord> {
    const currentYear = await this.database.client.orm.public.AcademicYear.where({
      isCurrent: true,
    })
      .all()
      .first();

    if (currentYear === null) {
      throw new NotFoundException('Current academic year not found');
    }

    return currentYear;
  }

  async getById(id: string): Promise<AcademicYearRecord> {
    const academicYear = await this.database.client.orm.public.AcademicYear.where({
      id,
    })
      .all()
      .first();

    if (academicYear === null) {
      throw new NotFoundException('Academic year not found');
    }

    return academicYear;
  }

  async create(dto: CreateAcademicYearDto): Promise<AcademicYearRecord> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Academic year name is required');
    }

    if (new Date(dto.startDate).getTime() >= new Date(dto.endDate).getTime()) {
      throw new BadRequestException('Academic year startDate must be before endDate');
    }

    await this.ensureUniqueName(name);

    if (dto.isCurrent === true) {
      await this.clearCurrentFlags();
    }

    try {
      return await this.database.client.orm.public.AcademicYear.create({
        name,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isCurrent: Boolean(dto.isCurrent),
      });
    } catch (error) {
      this.handleConflict(error, 'Academic year');
    }
  }

  async update(id: string, dto: UpdateAcademicYearDto): Promise<AcademicYearRecord> {
    const currentYear = await this.getById(id);
    const requestedName =
      dto.name !== undefined ? dto.name.trim() : currentYear.name;

    if (dto.name !== undefined && !requestedName) {
      throw new BadRequestException('Academic year name is required');
    }

    if (dto.name !== undefined && requestedName !== currentYear.name) {
      await this.ensureUniqueName(requestedName, id);
    }

    const startDate = dto.startDate ?? currentYear.startDate;
    const endDate = dto.endDate ?? currentYear.endDate;

    if (new Date(startDate).getTime() >= new Date(endDate).getTime()) {
      throw new BadRequestException('Academic year startDate must be before endDate');
    }

    const payload: {
      name?: string;
      startDate?: string;
      endDate?: string;
      isCurrent?: boolean;
    } = {};

    if (dto.name !== undefined) {
      payload.name = requestedName;
    }
    if (dto.startDate !== undefined) {
      payload.startDate = dto.startDate;
    }
    if (dto.endDate !== undefined) {
      payload.endDate = dto.endDate;
    }
    if (dto.isCurrent !== undefined) {
      payload.isCurrent = dto.isCurrent;
      if (dto.isCurrent === true) {
        await this.clearCurrentFlags(id);
      }
    }

    const updated = await this.database.client.orm.public.AcademicYear.where({
      id,
    }).update(payload);

    if (updated === null) {
      throw new NotFoundException('Academic year not found');
    }

    return updated;
  }

  async remove(id: string): Promise<AcademicYearRecord> {
    const academicYear = await this.getById(id);

    const linkedTerm = await this.database.client.orm.public.AcademicTerm.where({
      academicYearId: id,
    })
      .all()
      .first();

    if (linkedTerm !== null) {
      throw new ConflictException(
        'Cannot delete academic year with existing academic terms',
      );
    }

    const admittedStudent = await this.database.client.orm.public.Student.where({
      admissionAcademicYearId: id,
    })
      .all()
      .first();

    if (admittedStudent !== null) {
      throw new ConflictException(
        'Cannot delete academic year with admitted students',
      );
    }

    const removed = await this.database.client.orm.public.AcademicYear.where({
      id,
    }).delete();

    if (removed === null) {
      throw new NotFoundException('Academic year not found');
    }

    return removed;
  }

  private async ensureUniqueName(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existingAcademicYear = await this.database.client.orm.public.AcademicYear.where({
      name,
    })
      .all()
      .first();

    if (existingAcademicYear !== null && existingAcademicYear.id !== excludeId) {
      throw new ConflictException('Academic year name already exists');
    }
  }

  private async clearCurrentFlags(excludeId?: string): Promise<void> {
    const currentYears = await this.database.client.orm.public.AcademicYear.where({
      isCurrent: true,
    }).all();

    for (const currentYear of currentYears) {
      if (currentYear.id !== excludeId) {
        await this.database.client.orm.public.AcademicYear.where({
          id: currentYear.id,
        }).update({
          isCurrent: false,
        });
      }
    }
  }

  private handleConflict(error: unknown, resourceName: string): never {
    const prismaError = error as { code?: string; message?: string };

    if (prismaError?.code === 'P2002') {
      throw new ConflictException(`${resourceName} already exists`);
    }

    throw new ConflictException(`${resourceName} could not be saved`);
  }
}

type AcademicYearRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};
