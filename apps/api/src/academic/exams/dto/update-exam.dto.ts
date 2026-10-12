import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  examDate?: string;

  @IsOptional()
  @IsNumber()
  maxScore?: number;
}
