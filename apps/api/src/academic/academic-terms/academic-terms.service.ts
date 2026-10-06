import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { AcademicYearsService } from '../academic-years/academic-years.service.js';
import { CreateAcademicTermDto } from './dto/create-academic-term.dto.js';
import { UpdateAcademicTermDto } from './dto/update-academic-term.dto.js';

@Injectable()
export class AcademicTermsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly academicYearsService: AcademicYearsService,
  ) {}

  async listByAcademicYear(academicYearId: string): Promise<AcademicTermRecord[]> {
    await this.academicYearsService.getById(academicYearId);

    return this.database.client.orm.public.AcademicTerm.where({
      academicYearId,
    }).all();
  }

  async getCurrent(): Promise<AcademicTermRecord> {
    const currentTerm = await this.database.client.orm.public.AcademicTerm.where({
      isCurrent: true,
    })
      .all()
      .first();

    if (currentTerm === null) {
      throw new NotFoundException('Current academic term not found');
    }

    return currentTerm;
  }

  async getById(
    academicYearId: string,
    id: string,
  ): Promise<AcademicTermRecord> {
    await this.academicYearsService.getById(academicYearId);

    const academicTerm = await this.database.client.orm.public.AcademicTerm.where({
      id,
      academicYearId,
    })
      .all()
      .first();

    if (academicTerm === null) {
      throw new NotFoundException('Academic term not found');
    }

    return academicTerm;
  }

  async create(
    academicYearId: string,
    dto: CreateAcademicTermDto,
  ): Promise<AcademicTermRecord> {
    const year = await this.academicYearsService.getById(academicYearId);
    const targetYearId = dto.academicYearId ?? academicYearId;

    if (targetYearId !== academicYearId) {
      throw new BadRequestException(
        'Academic term academicYearId does not match the parent year',
      );
    }

    if (new Date(dto.startDate).getTime() >= new Date(dto.endDate).getTime()) {
      throw new BadRequestException('Academic term startDate must be before endDate');
    }

    const existingTerm = await this.database.client.orm.public.AcademicTerm.where({
      academicYearId,
      semester: dto.semester,
    })
      .all()
      .first();

    if (existingTerm !== null) {
      throw new ConflictException(
        'Academic term already exists for the given academic year and semester',
      );
    }

    if (dto.isCurrent === true && year.isCurrent !== true) {
      throw new BadRequestException(
        'A current academic term must belong to the current academic year',
      );
    }

    if (dto.isCurrent === true) {
      await this.clearCurrentFlags();
    }

    try {
      return await this.database.client.orm.public.AcademicTerm.create({
        academicYearId,
        semester: dto.semester,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isCurrent: Boolean(dto.isCurrent),
      });
    } catch (error) {
      this.handleConflict(error, 'Academic term');
    }
  }

  async update(
    academicYearId: string,
    id: string,
    dto: UpdateAcademicTermDto,
  ): Promise<AcademicTermRecord> {
    const currentTerm = await this.getById(academicYearId, id);
    const targetYearId = dto.academicYearId ?? academicYearId;

    if (targetYearId !== academicYearId) {
      throw new BadRequestException(
        'Academic term academicYearId does not match the parent year',
      );
    }

    const year = await this.academicYearsService.getById(academicYearId);
    const semester = dto.semester ?? currentTerm.semester;
    const startDate = dto.startDate ?? currentTerm.startDate;
    const endDate = dto.endDate ?? currentTerm.endDate;

    if (new Date(startDate).getTime() >= new Date(endDate).getTime()) {
      throw new BadRequestException('Academic term startDate must be before endDate');
    }

    if (dto.semester !== undefined) {
      const duplicate = await this.database.client.orm.public.AcademicTerm.where({
        academicYearId,
        semester,
      })
        .all()
        .first();

      if (duplicate !== null && duplicate.id !== id) {
        throw new ConflictException(
          'Academic term already exists for the given academic year and semester',
        );
      }
    }

    if (dto.isCurrent === true && year.isCurrent !== true) {
      throw new BadRequestException(
        'A current academic term must belong to the current academic year',
      );
    }

    const payload: {
      semester?: 'FIRST' | 'SECOND' | 'SUMMER';
      startDate?: string;
      endDate?: string;
      isCurrent?: boolean;
      academicYearId?: string;
    } = {};

    if (dto.semester !== undefined) {
      payload.semester = dto.semester;
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

    const updated = await this.database.client.orm.public.AcademicTerm.where({
      id,
      academicYearId,
    }).update(payload);

    if (updated === null) {
      throw new NotFoundException('Academic term not found');
    }

    return updated;
  }

  async remove(academicYearId: string, id: string): Promise<AcademicTermRecord> {
    await this.getById(academicYearId, id);

    const linkedOffering = await this.database.client.orm.public.CourseOffering.where({
      academicTermId: id,
    })
      .all()
      .first();

    if (linkedOffering !== null) {
      throw new ConflictException(
        'Cannot delete academic term with existing course offerings',
      );
    }

    const academicStanding = await this.database.client.orm.public.StudentAcademicStanding.where({
      academicTermId: id,
    })
      .all()
      .first();

    if (academicStanding !== null) {
      throw new ConflictException(
        'Cannot delete academic term with academic standings',
      );
    }

    const removed = await this.database.client.orm.public.AcademicTerm.where({
      id,
      academicYearId,
    }).delete();

    if (removed === null) {
      throw new NotFoundException('Academic term not found');
    }

    return removed;
  }

  private async clearCurrentFlags(excludeId?: string): Promise<void> {
    const currentTerms = await this.database.client.orm.public.AcademicTerm.where({
      isCurrent: true,
    }).all();

    for (const currentTerm of currentTerms) {
      if (currentTerm.id !== excludeId) {
        await this.database.client.orm.public.AcademicTerm.where({
          id: currentTerm.id,
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

type AcademicTermRecord = {
  id: string;
  academicYearId: string;
  semester: 'FIRST' | 'SECOND' | 'SUMMER';
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};
