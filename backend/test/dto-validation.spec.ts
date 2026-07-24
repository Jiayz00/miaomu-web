import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';
import { LoginDto } from '../src/modules/auth/dto/login.dto';
import { ChangePasswordDto } from '../src/modules/auth/dto/change-password.dto';
import { SendMessageDto } from '../src/modules/chat/dto/send-message.dto';
import { CreateBonsaiDto } from '../src/modules/bonsais/dto/create-bonsai.dto';
import { UpdateStatusDto } from '../src/common/dto/status.dto';
import { PaginationDto } from '../src/common/dto/pagination.dto';

/**
 * DTO 校验测试
 *
 * 覆盖关键路径：
 * - 注册：弱密码、用户名特殊字符、邮箱格式、超长字段
 * - 登录：账号过短、密码过短
 * - 改密：新密码弱、与原密码同（仅校验 DTO 层）
 * - 发送消息：内容超长、空、roomId 非整数
 * - 创建盆景：价格为负、年份越界
 * - 状态更新：status 非 0/1
 * - 分页：page/limit 边界
 *
 * 这是输入安全测试的核心：确保恶意输入在 DTO 层被拒绝
 */
async function validateDto<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  const instance = plainToInstance(cls, payload, { enableImplicitConversion: true });
  return validate(instance);
}

function expectContainsError(
  errors: ValidationError[],
  property: string,
): void {
  expect(errors.some((e) => e.property === property)).toBe(true);
}

describe('RegisterDto', () => {
  const valid = {
    username: 'penjing_lover',
    email: 'user@example.com',
    password: 'Penjing@2024',
  };

  it('合法字段应通过校验', async () => {
    const errors = await validateDto(RegisterDto, valid);
    expect(errors).toHaveLength(0);
  });

  it('用户名包含特殊字符应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      username: 'bad@user',
    });
    expectContainsError(errors, 'username');
  });

  it('用户名长度 < 3 应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      username: 'ab',
    });
    expectContainsError(errors, 'username');
  });

  it('用户名长度 > 50 应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      username: 'a'.repeat(51),
    });
    expectContainsError(errors, 'username');
  });

  it('邮箱格式错误应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      email: 'not-an-email',
    });
    expectContainsError(errors, 'email');
  });

  it('弱密码（无大写）应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      password: 'penjing@2024',
    });
    expectContainsError(errors, 'password');
  });

  it('弱密码（无数字）应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      password: 'PenjingPass@',
    });
    expectContainsError(errors, 'password');
  });

  it('弱密码（无特殊字符）应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      password: 'Penjing2024',
    });
    expectContainsError(errors, 'password');
  });

  it('密码长度 < 8 应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      password: 'Aa@1',
    });
    expectContainsError(errors, 'password');
  });

  it('密码长度 > 32 应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      password: 'Aa@1' + 'a'.repeat(40),
    });
    expectContainsError(errors, 'password');
  });

  it('手机号格式错误应拒绝', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      phone: '12345',
    });
    expectContainsError(errors, 'phone');
  });

  it('手机号合法应通过', async () => {
    const errors = await validateDto(RegisterDto, {
      ...valid,
      phone: '13800138000',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('LoginDto', () => {
  it('合法账号密码应通过', async () => {
    const errors = await validateDto(LoginDto, {
      account: 'tester',
      password: 'Pass@123',
    });
    expect(errors).toHaveLength(0);
  });

  it('账号长度 < 2 应拒绝', async () => {
    const errors = await validateDto(LoginDto, {
      account: 'a',
      password: 'Pass@123',
    });
    expectContainsError(errors, 'account');
  });

  it('密码长度 < 6 应拒绝', async () => {
    const errors = await validateDto(LoginDto, {
      account: 'tester',
      password: 'Aa@1',
    });
    expectContainsError(errors, 'password');
  });
});

describe('ChangePasswordDto', () => {
  it('合法新旧密码应通过', async () => {
    const errors = await validateDto(ChangePasswordDto, {
      oldPassword: 'Old@1234',
      newPassword: 'New@1234',
    });
    expect(errors).toHaveLength(0);
  });

  it('新密码不符合复杂度应拒绝', async () => {
    const errors = await validateDto(ChangePasswordDto, {
      oldPassword: 'Old@1234',
      newPassword: 'simple1234',
    });
    expectContainsError(errors, 'newPassword');
  });

  it('新密码长度越界应拒绝', async () => {
    const errors = await validateDto(ChangePasswordDto, {
      oldPassword: 'Old@1234',
      newPassword: 'Aa@1',
    });
    expectContainsError(errors, 'newPassword');
  });
});

describe('SendMessageDto', () => {
  it('合法内容应通过', async () => {
    const errors = await validateDto(SendMessageDto, {
      roomId: 1,
      content: '你好',
    });
    expect(errors).toHaveLength(0);
  });

  it('roomId 非整数应拒绝', async () => {
    const errors = await validateDto(SendMessageDto, {
      roomId: 1.5,
      content: '你好',
    });
    expectContainsError(errors, 'roomId');
  });

  it('roomId <= 0 应拒绝', async () => {
    const errors = await validateDto(SendMessageDto, {
      roomId: 0,
      content: '你好',
    });
    expectContainsError(errors, 'roomId');
  });

  it('空内容应拒绝', async () => {
    const errors = await validateDto(SendMessageDto, {
      roomId: 1,
      content: '',
    });
    expectContainsError(errors, 'content');
  });

  it('内容超长（> 2000）应拒绝', async () => {
    const errors = await validateDto(SendMessageDto, {
      roomId: 1,
      content: 'x'.repeat(2001),
    });
    expectContainsError(errors, 'content');
  });

  it('XSS payload 应能通过 DTO（HTML 转义在 gateway 层做）', async () => {
    // 这是预期行为：DTO 不负责 XSS 过滤，gateway 在保存前会 escapeHtml
    const errors = await validateDto(SendMessageDto, {
      roomId: 1,
      content: '<script>alert(1)</script>',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('CreateBonsaiDto', () => {
  const valid = {
    name: '黑松',
    slug: 'hei-song-001',
    description: '优美',
    price: 1280,
    origin: '江苏扬州',
    year: 2024,
    categoryId: 1,
  };

  it('合法字段应通过', async () => {
    const errors = await validateDto(CreateBonsaiDto, valid);
    expect(errors).toHaveLength(0);
  });

  it('价格为负应拒绝', async () => {
    const errors = await validateDto(CreateBonsaiDto, {
      ...valid,
      price: -100,
    });
    expectContainsError(errors, 'price');
  });

  it('年份 < 1900 应拒绝', async () => {
    const errors = await validateDto(CreateBonsaiDto, {
      ...valid,
      year: 1899,
    });
    expectContainsError(errors, 'year');
  });

  it('年份 > 2100 应拒绝', async () => {
    const errors = await validateDto(CreateBonsaiDto, {
      ...valid,
      year: 2101,
    });
    expectContainsError(errors, 'year');
  });

  it('名称为空应拒绝', async () => {
    const errors = await validateDto(CreateBonsaiDto, {
      ...valid,
      name: '',
    });
    expectContainsError(errors, 'name');
  });

  it('slug 超长（> 120）应拒绝', async () => {
    const errors = await validateDto(CreateBonsaiDto, {
      ...valid,
      slug: 'a'.repeat(121),
    });
    expectContainsError(errors, 'slug');
  });

  it('description 超长（> 5000）应拒绝', async () => {
    const errors = await validateDto(CreateBonsaiDto, {
      ...valid,
      description: 'x'.repeat(5001),
    });
    expectContainsError(errors, 'description');
  });

  it('categoryId 非整数应拒绝', async () => {
    const errors = await validateDto(CreateBonsaiDto, {
      ...valid,
      categoryId: 1.5,
    });
    expectContainsError(errors, 'categoryId');
  });

  it('images 数组超过 20 个应拒绝', async () => {
    const errors = await validateDto(CreateBonsaiDto, {
      ...valid,
      images: Array.from({ length: 21 }, () => ({ url: 'http://x/y.jpg' })),
    });
    expectContainsError(errors, 'images');
  });
});

describe('UpdateStatusDto', () => {
  it('status=0 应通过', async () => {
    const errors = await validateDto(UpdateStatusDto, { status: 0 });
    expect(errors).toHaveLength(0);
  });

  it('status=1 应通过', async () => {
    const errors = await validateDto(UpdateStatusDto, { status: 1 });
    expect(errors).toHaveLength(0);
  });

  it('status=2 应拒绝', async () => {
    const errors = await validateDto(UpdateStatusDto, { status: 2 });
    expectContainsError(errors, 'status');
  });

  it('status=-1 应拒绝', async () => {
    const errors = await validateDto(UpdateStatusDto, { status: -1 });
    expectContainsError(errors, 'status');
  });

  it('status 为字符串 "1" 在隐式转换下应通过', async () => {
    // 隐式转换：transformOptions.enableImplicitConversion
    const errors = await validateDto(UpdateStatusDto, { status: '1' });
    expect(errors).toHaveLength(0);
  });
});

describe('PaginationDto', () => {
  it('默认值应通过', async () => {
    const errors = await validateDto(PaginationDto, {});
    expect(errors).toHaveLength(0);
  });

  it('page < 1 应拒绝', async () => {
    const errors = await validateDto(PaginationDto, { page: 0 });
    expectContainsError(errors, 'page');
  });

  it('limit > 100 应拒绝', async () => {
    const errors = await validateDto(PaginationDto, { limit: 101 });
    expectContainsError(errors, 'limit');
  });

  it('keyword 超长（> 100）应拒绝', async () => {
    const errors = await validateDto(PaginationDto, {
      keyword: 'x'.repeat(101),
    });
    expectContainsError(errors, 'keyword');
  });
});
