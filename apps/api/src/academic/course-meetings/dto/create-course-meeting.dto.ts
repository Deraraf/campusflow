import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export class CreateCourseMeetingDto {
  @IsIn(DAYS_OF_WEEK)
  dayOfWeek!: (typeof DAYS_OF_WEEK)[number];

  @IsString()
  @IsNotEmpty()
  @Matches(/^\s*(?:[01]\d|2[0-3]):[0-5]\d\s*$/)
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\s*(?:[01]\d|2[0-3]):[0-5]\d\s*$/)
  endTime!: string;

  @IsString()
  @IsOptional()
  room?: string | null;
}
