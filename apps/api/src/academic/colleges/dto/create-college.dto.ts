import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCollegeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsUUID()
  @IsOptional()
  deanId?: string | null;
}
