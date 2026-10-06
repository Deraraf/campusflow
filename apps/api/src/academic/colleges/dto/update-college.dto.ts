import {
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateCollegeDto {
  @IsString()
  @IsNotEmpty()
  @ValidateIf((_object, value) => value !== undefined)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((_object, value) => value !== undefined)
  code?: string;

  @IsUUID()
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  deanId?: string | null;
}
