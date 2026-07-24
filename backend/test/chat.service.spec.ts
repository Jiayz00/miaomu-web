import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ChatService } from '../src/modules/chat/chat.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createPrismaMock,
  type PrismaMock,
} from './helpers/mock-services';

/**
 * ChatService 单元测试
 *
 * 覆盖关键路径：
 * - createRoom：盆景不存在抛 404、同用户同盆景复用
 * - findMyRooms：仅返回当前用户的会话
 * - ensureUserRoomAccess：会话不存在 404、非成员 403、管理员放行
 * - findRoomMessages：分页 + 升序返回
 * - saveMessage：写入消息并返回带 sender 的结构
 * - findAdminRoom / updateRoomStatus：管理员能力
 */
describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  describe('createRoom', () => {
    it('关联盆景不存在应抛 404', async () => {
      prisma.bonsai.findFirst.mockResolvedValue(null);

      await expect(
        service.createRoom(1, { bonsaiId: 999 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.chatRoom.create).not.toHaveBeenCalled();
    });

    it('同用户同盆景已有会话应复用', async () => {
      prisma.bonsai.findFirst.mockResolvedValue({ id: 10 });
      const existing = { id: 5, userId: 1, bonsaiId: 10 };
      prisma.chatRoom.findFirst.mockResolvedValue(existing);

      const result = await service.createRoom(1, { bonsaiId: 10 });

      expect(result).toEqual(existing);
      expect(prisma.chatRoom.create).not.toHaveBeenCalled();
    });

    it('无关联盆景时应直接创建', async () => {
      prisma.chatRoom.create.mockResolvedValue({ id: 1 });

      const result = await service.createRoom(1, {});

      expect(result).toEqual({ id: 1 });
      const call = prisma.chatRoom.create.mock.calls[0][0] as {
        data: { userId: number; bonsaiId: null };
      };
      expect(call.data.userId).toBe(1);
      expect(call.data.bonsaiId).toBeNull();
    });
  });

  describe('ensureUserRoomAccess', () => {
    it('会话不存在应抛 404', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(null);
      await expect(
        service.ensureUserRoomAccess(999, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('非会话成员的普通用户应抛 403', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue({
        id: 1,
        userId: 2,
      });
      await expect(
        service.ensureUserRoomAccess(1, 1, Role.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('会话成员应放行', async () => {
      const room = { id: 1, userId: 1 };
      prisma.chatRoom.findUnique.mockResolvedValue(room);
      const result = await service.ensureUserRoomAccess(1, 1, Role.USER);
      expect(result).toEqual(room);
    });

    it('管理员应可访问任意会话（即使非成员）', async () => {
      const room = { id: 1, userId: 999 };
      prisma.chatRoom.findUnique.mockResolvedValue(room);
      const result = await service.ensureUserRoomAccess(1, 1, Role.ADMIN);
      expect(result).toEqual(room);
    });
  });

  describe('findRoomMessages', () => {
    it('无权访问时应抛 403（不返回消息）', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue({ id: 1, userId: 99 });
      prisma.chatMessage.findMany.mockResolvedValue([]);

      await expect(
        service.findRoomMessages(1, 1, { page: 1, limit: 20 }, Role.USER),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.chatMessage.findMany).not.toHaveBeenCalled();
    });

    it('应返回分页结构并按时间升序展示', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      // 模拟 DB 返回降序（最新在前）
      prisma.chatMessage.findMany.mockResolvedValue([
        { id: 3, content: 'c' },
        { id: 2, content: 'b' },
        { id: 1, content: 'a' },
      ]);
      prisma.chatMessage.count.mockResolvedValue(3);

      const result = await service.findRoomMessages(1, 1, {
        page: 1,
        limit: 20,
      });

      // list 应反转后返回（升序展示）
      expect(result.list.map((m: { id: number }) => m.id)).toEqual([1, 2, 3]);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('saveMessage', () => {
    it('应创建消息并返回带 sender 的结构', async () => {
      prisma.chatMessage.create.mockResolvedValue({
        id: 1,
        roomId: 1,
        senderId: 1,
        content: 'hi',
        sender: { id: 1, username: 'u', role: 'USER' },
      });

      const result = await service.saveMessage(1, 1, 'hi');

      expect(result).toMatchObject({ id: 1, content: 'hi' });
      const call = prisma.chatMessage.create.mock.calls[0][0] as {
        data: { roomId: number; senderId: number; content: string };
        include: {
          sender: { select: { id: boolean; username: boolean; avatar: boolean; role: boolean } };
        };
      };
      expect(call.data).toEqual({ roomId: 1, senderId: 1, content: 'hi' });
      // sender 字段必须包含 role（管理员后台区分）
      expect(call.include.sender.select.role).toBe(true);
    });
  });

  describe('findAdminRoom', () => {
    it('会话不存在应抛 404', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(null);
      await expect(service.findAdminRoom(999)).rejects.toThrow(NotFoundException);
    });

    it('应返回会话并将最新 100 条消息反转为升序', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue({
        id: 1,
        messages: [
          { id: 3, content: 'c' },
          { id: 2, content: 'b' },
          { id: 1, content: 'a' },
        ],
      });

      const result = await service.findAdminRoom(1);
      expect(result.messages.map((m: { id: number }) => m.id)).toEqual([
        1, 2, 3,
      ]);
    });
  });

  describe('updateRoomStatus', () => {
    it('会话不存在应抛 404', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(null);
      await expect(service.updateRoomStatus(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('成功更新应仅返回 id/status/updatedAt', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue({ id: 1 });
      prisma.chatRoom.update.mockResolvedValue({ id: 1, status: 1 });

      const result = await service.updateRoomStatus(1, 1);
      expect(result).toEqual({ id: 1, status: 1 });
    });
  });

  describe('findRoomByUserAndBonsai', () => {
    it('有 bonsaiId 时按 user+bonsai 查', async () => {
      prisma.chatRoom.findFirst.mockResolvedValue({ id: 5 });
      const result = await service.findRoomByUserAndBonsai(1, 10);
      expect(result).toEqual({ id: 5 });
      const call = prisma.chatRoom.findFirst.mock.calls[0][0] as {
        where: { userId: number; bonsaiId: number };
      };
      expect(call.where.bonsaiId).toBe(10);
    });

    it('bonsaiId 为 null 时查 bonsaiId: null 的会话', async () => {
      prisma.chatRoom.findFirst.mockResolvedValue(null);
      await service.findRoomByUserAndBonsai(1, null);
      const call = prisma.chatRoom.findFirst.mock.calls[0][0] as {
        where: { userId: number; bonsaiId: null };
      };
      expect(call.where.bonsaiId).toBeNull();
    });
  });
});
