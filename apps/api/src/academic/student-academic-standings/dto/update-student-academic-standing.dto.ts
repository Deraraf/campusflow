import { IsInt, IsUUID, Min, ValidateIf } from 'class-validator';

export class UpdateStudentAcademicStandingDto {
  @IsUUID()
  @ValidateIf((_object, value) => value !== undefined)
  academicTermId?: string;

  @IsInt()
  @Min(1)
  @ValidateIf((_object, value) => value !== undefined)
  programYear?: number;
}
