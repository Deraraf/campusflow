import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  score!: number;
}
