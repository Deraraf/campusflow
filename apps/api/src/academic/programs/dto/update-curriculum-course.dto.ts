import { IsBoolean, IsIn, IsInt, Min, ValidateIf } from 'class-validator';

export class UpdateCurriculumCourseDto {
  @IsInt()
  @Min(1)
  @ValidateIf((_object, value) => value !== undefined)
  year?: number;

  @IsIn(['FIRST', 'SECOND', 'SUMMER'])
  @ValidateIf((_object, value) => value !== undefined)
  semester?: 'FIRST' | 'SECOND' | 'SUMMER';

  @IsInt()
  @Min(1)
  @ValidateIf((_object, value) => value !== undefined)
  credits?: number;

  @IsIn(['CORE', 'ELECTIVE', 'GENERAL'])
  @ValidateIf((_object, value) => value !== undefined)
  courseType?: 'CORE' | 'ELECTIVE' | 'GENERAL';

  @IsBoolean()
  @ValidateIf((_object, value) => value !== undefined)
  isRequired?: boolean;
}
