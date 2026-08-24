import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({
    example: "a1b2c3d4e5f6...",
    description: "Verification token received in email link",
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
