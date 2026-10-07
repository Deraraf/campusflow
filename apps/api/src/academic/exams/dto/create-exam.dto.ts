import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  examDate!: string;

  @IsNumber()
  maxScore!: number;
}
