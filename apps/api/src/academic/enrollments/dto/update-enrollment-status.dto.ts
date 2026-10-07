import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateEnrollmentStatusDto {
  @IsEnum(['ACTIVE', 'DROPPED', 'COMPLETED', 'FAILED'])
  @IsNotEmpty()
  status!: 'ACTIVE' | 'DROPPED' | 'COMPLETED' | 'FAILED';
}
