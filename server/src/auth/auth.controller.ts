import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ApiBody, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AUTH_ACCESS_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME } from "./auth.constants";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import type { AuthenticatedUser } from "./auth.types";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie(AUTH_ACCESS_COOKIE_NAME, accessToken, {
      ...this.authService.getAccessCookieOptions(),
      maxAge: this.authService.getAccessCookieMaxAgeMs(),
    });

    response.cookie(AUTH_REFRESH_COOKIE_NAME, refreshToken, {
      ...this.authService.getRefreshCookieOptions(),
      maxAge: this.authService.getRefreshCookieMaxAgeMs(),
    });
  }

  private clearAuthCookies(response: Response) {
    response.clearCookie(AUTH_ACCESS_COOKIE_NAME, this.authService.getAccessCookieOptions());
    response.clearCookie(AUTH_REFRESH_COOKIE_NAME, this.authService.getRefreshCookieOptions());
  }

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Register a new customer account" })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: "Customer registered successfully." })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.registerCustomer(dto);
    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return result.user;
  }

  @Post("login")
  @Public()
  @ApiOperation({ summary: "Login with email and password" })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({ description: "User logged in successfully." })
  @ApiUnauthorizedResponse({ description: "Invalid email or password" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return result.user;
  }

  @Post("refresh")
  @Public()
  @ApiOperation({ summary: "Rotate the current refresh session" })
  @ApiCreatedResponse({ description: "Session rotated successfully." })
  @ApiUnauthorizedResponse({ description: "Invalid or expired refresh session" })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(
      request.cookies?.[AUTH_REFRESH_COOKIE_NAME],
    );
    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return result.user;
  }

  @Post("logout")
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke the current refresh session and clear cookies" })
  @ApiNoContentResponse({ description: "Logged out." })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.cookies?.[AUTH_REFRESH_COOKIE_NAME]);
    this.clearAuthCookies(response);
  }

  @Get("me")
  @ApiOperation({ summary: "Get the current authenticated user" })
  @ApiOkResponse({ description: "Current user retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Post("logout-all")
  @ApiOperation({ summary: "Revoke all active sessions for the current user" })
  @ApiOkResponse({ description: "All sessions revoked successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required" })
  @ApiForbiddenResponse({ description: "You do not have permission to access this resource" })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logoutAll(user.id);
    this.clearAuthCookies(response);

    return {
      success: true,
    };
  }
}