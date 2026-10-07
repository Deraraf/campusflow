import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateStudentApplicationDto {
  @IsUUID()
  @IsNotEmpty()
  programId!: string;
}
