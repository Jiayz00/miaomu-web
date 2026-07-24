import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  ParseArrayPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

/**
 * 收藏控制器
 * 路由前缀：/favorites，需用户认证
 */
@ApiTags('收藏')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: '我的收藏列表' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationDto) {
    return this.favoritesService.findMyList(user.sub, query);
  }

  @Post(':bonsaiId')
  @ApiOperation({ summary: '收藏盆景' })
  favorite(
    @CurrentUser() user: JwtPayload,
    @Param('bonsaiId', ParseIntPipe) bonsaiId: number,
  ) {
    return this.favoritesService.favorite(user.sub, bonsaiId);
  }

  @Delete(':bonsaiId')
  @ApiOperation({ summary: '取消收藏' })
  unfavorite(
    @CurrentUser() user: JwtPayload,
    @Param('bonsaiId', ParseIntPipe) bonsaiId: number,
  ) {
    return this.favoritesService.unfavorite(user.sub, bonsaiId);
  }

  @Get('check/:bonsaiId')
  @ApiOperation({ summary: '检查是否已收藏（单个）' })
  check(
    @CurrentUser() user: JwtPayload,
    @Param('bonsaiId', ParseIntPipe) bonsaiId: number,
  ) {
    return this.favoritesService.check(user.sub, bonsaiId);
  }

  @Get('batch-check')
  @ApiOperation({
    summary: '批量检查收藏状态（列表页优化，避免 N+1）',
    description: '传入 ids=1,2,3 查询多个盆景的收藏状态',
  })
  batchCheck(
    @CurrentUser() user: JwtPayload,
    @Query(
      'ids',
      new ParseArrayPipe({
        items: Number,
        separator: ',',
        optional: false,
      }),
    )
    ids: number[],
  ) {
    return this.favoritesService.batchCheck(user.sub, ids);
  }
}
