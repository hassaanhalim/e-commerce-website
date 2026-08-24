import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GoogleAuthDto {
  @ApiProperty({
    example: "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
    description: "Google ID Token / Credential string returned by Google Identity Services",
  })
  @IsString()
  @IsNotEmpty()
  credential!: string;
}
