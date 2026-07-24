import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * HttpExceptionFilter 单元测试
 *
 * 覆盖关键路径：
 * - HttpException（string / object 响应）
 * - class-validator 数组消息（拼接为字符串）
 * - Prisma P2002 唯一性冲突 → 409
 * - Prisma P2025 记录不存在 → 404
 * - Prisma 其他错误 → 400
 * - 普通 Error → 500 + 不泄露内部 message
 * - 响应体结构：{ statusCode, message, error, timestamp, path, requestId }
 * - 5xx 错误应记录日志
 */
describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: Record<string, unknown>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = {
      method: 'POST',
      url: '/api/v1/test',
      requestId: 'req-123',
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  function getBody(): Record<string, unknown> {
    return mockResponse.json.mock.calls[0][0] as Record<string, unknown>;
  }

  describe('HttpException', () => {
    it('string 响应应正确提取 message', () => {
      const ex = new HttpException('forbidden', HttpStatus.FORBIDDEN);
      filter.catch(ex, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      const body = getBody();
      expect(body.statusCode).toBe(403);
      expect(body.message).toBe('forbidden');
      expect(body.requestId).toBe('req-123');
      expect(body.path).toBe('/api/v1/test');
      expect(body.timestamp).toBeDefined();
    });

    it('object 响应应正确提取 message 与 error', () => {
      const ex = new HttpException(
        { statusCode: 400, message: '参数错误', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(ex, mockHost);

      const body = getBody();
      expect(body.message).toBe('参数错误');
      expect(body.error).toBe('Bad Request');
    });

    it('class-validator 数组 message 应拼接为字符串', () => {
      const ex = new HttpException(
        {
          statusCode: 400,
          message: ['username must be a string', 'password too short'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(ex, mockHost);

      const body = getBody();
      expect(body.message).toBe(
        'username must be a string; password too short',
      );
    });

    it('requestId 缺失应回退为 -', () => {
      delete mockRequest.requestId;
      const ex = new HttpException('x', 400);
      filter.catch(ex, mockHost);
      expect(getBody().requestId).toBe('-');
    });
  });

  describe('Prisma 错误', () => {
    it('P2002 唯一性冲突应映射为 409', () => {
      const ex = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '5.20.0',
      });
      filter.catch(ex, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      const body = getBody();
      expect(body.message).toBe('数据唯一性冲突');
      expect(body.error).toBe('Conflict');
    });

    it('P2025 记录不存在应映射为 404', () => {
      const ex = new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: '5.20.0',
      });
      filter.catch(ex, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(getBody().message).toBe('记录不存在');
    });

    it('其他 Prisma 错误应映射为 400 并包含 code', () => {
      const ex = new Prisma.PrismaClientKnownRequestError('other', {
        code: 'P2003',
        clientVersion: '5.20.0',
      });
      filter.catch(ex, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(getBody().message).toContain('P2003');
    });
  });

  describe('未知错误', () => {
    it('普通 Error 应返回 500 且不泄露内部 message', () => {
      const ex = new Error('DB connection lost: mysql://user:pass@host');
      filter.catch(ex, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const body = getBody();
      expect(body.message).toBe('服务器内部错误');
      // 不应泄露内部错误细节
      expect(String(body.message)).not.toContain('mysql://');
    });

    it('非 Error 对象也应返回 500', () => {
      filter.catch('something weird', mockHost);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
