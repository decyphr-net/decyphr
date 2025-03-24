import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateBotDto {
  @IsNotEmpty({ message: 'Field name is required' })
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  background?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  hobbies?: string;

  @IsOptional()
  @IsString()
  personal?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
