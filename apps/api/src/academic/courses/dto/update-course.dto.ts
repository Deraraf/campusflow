import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class UpdateCourseDto {
  @IsString()
  @IsNotEmpty()
  @ValidateIf((_object, value) => value !== undefined)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((_object, value) => value !== undefined)
  title?: string;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  description?: string | null;
}
