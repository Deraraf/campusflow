import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAcademicTermDto {
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['FIRST', 'SECOND', 'SUMMER'])
  semester!: 'FIRST' | 'SECOND' | 'SUMMER';

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
