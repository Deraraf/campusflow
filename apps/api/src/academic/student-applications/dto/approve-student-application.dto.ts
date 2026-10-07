import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class ApproveStudentApplicationDto {
  @IsString()
  @IsNotEmpty()
  studentNumber!: string;

  @IsUUID()
  @IsNotEmpty()
  admissionAcademicYearId!: string;

  @IsUUID()
  @IsNotEmpty()
  academicTermId!: string;

  @IsInt()
  @Min(1)
  programYear!: number;
}
