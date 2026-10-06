import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsUUID()
  @IsNotEmpty()
  collegeId!: string;
}
