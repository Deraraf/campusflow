import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateGradeDto {
  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  letterGrade?: string;
}
