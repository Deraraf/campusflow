import { IsOptional, IsString } from 'class-validator';

export class UpdateSubmissionDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
