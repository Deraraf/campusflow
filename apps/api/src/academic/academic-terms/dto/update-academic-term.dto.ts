import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateAcademicTermDto {
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['FIRST', 'SECOND', 'SUMMER'])
  semester?: 'FIRST' | 'SECOND' | 'SUMMER';

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
