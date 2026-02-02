import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class InteractionMetadata {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  timestamp: number;
}