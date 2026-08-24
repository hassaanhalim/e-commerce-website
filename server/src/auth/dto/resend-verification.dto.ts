import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ResendVerificationDto {
  @ApiProperty({
    example: "customer@example.com",
    description: "Email address to resend verification link to",
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
