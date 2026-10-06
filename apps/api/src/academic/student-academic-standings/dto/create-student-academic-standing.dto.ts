import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateStudentAcademicStandingDto {
  @IsUUID()
  @IsNotEmpty()
  academicTermId!: string;

  @IsInt()
  @Min(1)
  programYear!: number;
}
