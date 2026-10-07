import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  MAX_PROGRAM_DURATION_YEARS,
  MIN_PROGRAM_DURATION_YEARS,
} from './create-program.dto.js';

export class UpdateProgramDto {
  @IsString()
  @IsNotEmpty()
  @ValidateIf((_object, value) => value !== undefined)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((_object, value) => value !== undefined)
  code?: string;

  @IsUUID()
  @ValidateIf((_object, value) => value !== undefined)
  departmentId?: string;

  @IsInt()
  @Min(MIN_PROGRAM_DURATION_YEARS)
  @Max(MAX_PROGRAM_DURATION_YEARS)
  @ValidateIf((_object, value) => value !== undefined)
  durationYears?: number;

  @IsUUID()
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  coordinatorInstructorId?: string | null;
}
