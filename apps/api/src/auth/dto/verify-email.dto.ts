import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  token: string;
}
