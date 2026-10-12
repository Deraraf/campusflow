import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['USER'])
  role!: 'USER';

  @IsString()
  @IsNotEmpty()
  content!: string;
}
