import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCurriculumCourseDto {
  @IsUUID()
  @IsNotEmpty()
  courseId!: string;

  @IsInt()
  @Min(1)
  year!: number;

  @IsIn(['FIRST', 'SECOND', 'SUMMER'])
  semester!: 'FIRST' | 'SECOND' | 'SUMMER';

  @IsInt()
  @Min(1)
  credits!: number;

  @IsIn(['CORE', 'ELECTIVE', 'GENERAL'])
  courseType!: 'CORE' | 'ELECTIVE' | 'GENERAL';

  @IsBoolean()
  isRequired!: boolean;
}
