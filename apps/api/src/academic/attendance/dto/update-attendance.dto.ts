import { IsOptional, IsString } from 'class-validator';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}
