import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateCourseOfferingDto {
  @IsUUID()
  @ValidateIf((_object, value) => value !== undefined)
  academicTermId?: string;

  @IsUUID()
  @ValidateIf((_object, value) => value !== undefined)
  instructorId?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((_object, value) => value !== undefined)
  section?: string;

  @IsInt()
  @Min(1)
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  capacity?: number | null;
}
