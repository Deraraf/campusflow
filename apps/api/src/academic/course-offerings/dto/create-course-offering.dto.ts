import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCourseOfferingDto {
  @IsUUID()
  @IsNotEmpty()
  academicTermId!: string;

  @IsUUID()
  @IsNotEmpty()
  instructorId!: string;

  @IsString()
  @IsNotEmpty()
  section!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number | null;
}
