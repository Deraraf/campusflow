import { IsIn } from 'class-validator';

export const STUDENT_STATUSES = [
  'ACTIVE',
  'SUSPENDED',
  'GRADUATED',
  'WITHDRAWN',
] as const;

export class UpdateStudentStatusDto {
  @IsIn(STUDENT_STATUSES)
  status!: (typeof STUDENT_STATUSES)[number];
}
