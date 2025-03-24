import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateBotDto {
  @IsNotEmpty({ message: 'Field name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Field gender is required' })
  @IsString()
  gender: string;

  @IsNotEmpty({ message: 'Field age is required' })
  @IsInt()
  age: number;

  @IsNotEmpty({ message: 'Field region is required' })
  @IsString()
  region: string;

  @IsNotEmpty({ message: 'Field city is required' })
  @IsString()
  city: string;

  @IsNotEmpty({ message: 'Field background is required' })
  @IsString()
  background: string;

  @IsNotEmpty({ message: 'Field occupation is required' })
  @IsString()
  occupation: string;

  @IsNotEmpty({ message: 'Field hobbies is required' })
  @IsString()
  hobbies: string;

  @IsNotEmpty({ message: 'Field personal is required' })
  @IsString()
  personal: string;

  @IsNotEmpty({ message: 'Field language is required' })
  @IsString()
  language: string;
}
