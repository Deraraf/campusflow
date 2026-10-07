import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGradeDto {
  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  letterGrade?: string;
}
