import { IsNotEmpty, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UpdateDepartmentDto {
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
  collegeId?: string;

  @IsUUID()
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  headInstructorId?: string | null;
}
