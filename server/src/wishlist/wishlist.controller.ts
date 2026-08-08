import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { WishlistService } from "./wishlist.service";
import { AddWishlistItemDto, MergeWishlistDto } from "./dto/wishlist.dto";

@Controller("wishlist")
@Roles("CUSTOMER")
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post("items")
  @HttpCode(HttpStatus.CREATED)
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistService.addItem(user.id, dto);
  }

  @Delete("items/:productId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("productId") productId: string,
  ) {
    await this.wishlistService.removeItem(user.id, productId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearWishlist(@CurrentUser() user: AuthenticatedUser) {
    await this.wishlistService.clearWishlist(user.id);
  }

  @Post("merge")
  mergeWishlist(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MergeWishlistDto,
  ) {
    return this.wishlistService.mergeGuestWishlist(user.id, dto);
  }
}
