import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * 认证控制器
 * 提供注册、登录、刷新令牌、获取个人信息、登出
 *
 * 限流策略：
 * - 注册 / 登录 / 刷新：每分钟 5 次（防暴力破解与令牌枚举）
 * - 其余接口受全局默认限流（100/min）
 */
@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: '用户注册' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: '用户登录' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: '刷新访问令牌（一次性轮换）' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  profile(@CurrentUser() user: JwtPayload) {
    return this.authService.getUserProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: '用户登出（令牌加入黑名单）' })
  async logout(@CurrentUser() user: JwtPayload) {
    // 将 access token 的 jti 加入 Redis 黑名单，撤销该用户所有 refresh token
    await this.authService.logout(user);
    return { message: '已成功登出' };
  }
}
