import { IsBoolean } from 'class-validator';

export class UpdateChallengeDto {
  @IsBoolean()
  completed!: boolean;
}
