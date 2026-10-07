import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

// Supported Program duration is limited to 1-10 years.
export const MIN_PROGRAM_DURATION_YEARS = 1;
export const MAX_PROGRAM_DURATION_YEARS = 10;

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @IsInt()
  @Min(MIN_PROGRAM_DURATION_YEARS)
  @Max(MAX_PROGRAM_DURATION_YEARS)
  durationYears!: number;
}
