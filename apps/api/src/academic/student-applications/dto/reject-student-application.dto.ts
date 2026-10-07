import { IsNotEmpty, IsString } from 'class-validator';

export class RejectStudentApplicationDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}
