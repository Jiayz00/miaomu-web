import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UpdateStatusDto } from '../../common/dto/status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

/**
 * 聊天控制器（用户）
 */
@ApiTags('聊天')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms')
  @ApiOperation({ summary: '创建会话（可选关联盆景）' })
  createRoom(@CurrentUser() user: JwtPayload, @Body() dto: CreateRoomDto) {
    return this.chatService.createRoom(user.sub, dto);
  }

  @Get('rooms')
  @ApiOperation({ summary: '我的会话列表' })
  findMyRooms(@CurrentUser() user: JwtPayload) {
    return this.chatService.findMyRooms(user.sub);
  }

  @Get('rooms/:id/messages')
  @ApiOperation({ summary: '会话消息（分页）' })
  findMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationDto,
  ) {
    return this.chatService.findRoomMessages(id, user.sub, query, user.role);
  }
}

/**
 * 聊天管理控制器（管理员）
 */
@ApiTags('聊天-管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(Role.ADMIN)
@Controller('admin/chat')
export class ChatAdminController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  @ApiOperation({ summary: '所有会话列表' })
  findAll() {
    return this.chatService.findAdminRooms();
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: '会话详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.findAdminRoom(id);
  }

  @Patch('rooms/:id/status')
  @ApiOperation({ summary: '标记会话已处理' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.chatService.updateRoomStatus(id, dto.status);
  }
}
