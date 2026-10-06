import {
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { DAYS_OF_WEEK } from './create-course-meeting.dto.js';

export class UpdateCourseMeetingDto {
  @IsIn(DAYS_OF_WEEK)
  @ValidateIf((_object, value) => value !== undefined)
  dayOfWeek?: (typeof DAYS_OF_WEEK)[number];

  @IsString()
  @IsNotEmpty()
  @Matches(/^\s*(?:[01]\d|2[0-3]):[0-5]\d\s*$/)
  @ValidateIf((_object, value) => value !== undefined)
  startTime?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\s*(?:[01]\d|2[0-3]):[0-5]\d\s*$/)
  @ValidateIf((_object, value) => value !== undefined)
  endTime?: string;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  room?: string | null;
}
