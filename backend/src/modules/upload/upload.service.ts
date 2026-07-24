import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { MAX_FILE_SIZE, MAX_FILES_PER_REQUEST } from './upload.constants';

/**
 * 文件上传服务
 *
 * 安全设计：
 * - 双重类型校验：① 客户端声明的 mimetype 白名单；② 通过 Sharp 读取 magic bytes 确认真实为图片
 * - 文件大小校验
 * - UUID v4 随机化文件名，统一输出 .jpg，杜绝扩展名注入
 * - Sharp 重采样至 1200px + mozjpeg 压缩
 * - 图片维度校验，防止 1×1 或超大像素触发 OOM
 * - 上传目录权限 0o750
 *
 * 配置单一来源：MAX_FILE_SIZE / MAX_FILES_PER_REQUEST 与 UploadController 共享常量
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly allowedMimeTypes: string[];
  private readonly maxFileSize: number;
  private readonly minDimension = 64; // 最小 64×64
  private readonly maxDimension = 8000; // 最大 8000×8000

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('upload.dir') || './uploads';
    this.allowedMimeTypes = this.configService.get<string[]>('upload.allowedMimeTypes') || [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    // 优先读取环境变量配置；缺失时回退到模块常量（与 Controller 共享同一来源）
    this.maxFileSize = this.configService.get<number>('upload.maxFileSize') || MAX_FILE_SIZE;

    this.ensureUploadDir();
  }

  /**
   * 单图上传
   * 返回访问 URL
   */
  async uploadSingle(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
    this.validateFile(file);

    const filename = await this.processImage(file);
    const url = `/uploads/${filename}`;

    this.logger.log(`✅ 图片上传成功: ${filename} (${file.originalname})`);
    return { url, filename };
  }

  /**
   * 多图上传
   */
  async uploadMultiple(
    files: Express.Multer.File[],
  ): Promise<{ urls: Array<{ url: string; filename: string }> }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('请至少上传一张图片');
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      throw new BadRequestException(`单次最多上传 ${MAX_FILES_PER_REQUEST} 张图片`);
    }

    const results = await Promise.all(
      files.map(async (file) => {
        this.validateFile(file);
        const filename = await this.processImage(file);
        return { url: `/uploads/${filename}`, filename };
      }),
    );

    this.logger.log(`✅ 批量上传 ${results.length} 张图片`);
    return { urls: results };
  }

  /**
   * 校验文件类型与大小
   * - mimetype 白名单
   * - 大小限制
   * - 原始文件名扩展名校验（必须为空或 jpg/jpeg/png/webp）
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `文件类型不支持，仅允许: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `文件大小超过限制 (最大 ${this.maxFileSize / 1024 / 1024}MB)`,
      );
    }
    // 校验原始扩展名，防止 .jpg.exe 类多扩展名伪装
    const originalName = file.originalname || '';
    const lastDot = originalName.lastIndexOf('.');
    if (lastDot >= 0) {
      const ext = originalName.slice(lastDot).toLowerCase();
      const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!allowedExt.includes(ext)) {
        throw new BadRequestException('文件扩展名不被允许');
      }
    }
  }

  /**
   * Sharp 压缩图片
   *
   * 步骤：
   * 1. 通过 sharp.metadata() 读取真实图片格式（magic bytes 校验）
   *    - 防止伪造 mimetype 上传可执行文件或 SVG（含 script）
   * 2. 校验图片维度，防止 1×1 或超大尺寸
   * 3. 重采样至 1200px（保持比例）并输出 JPEG
   *
   * 文件名统一为 `${uuid}.jpg`，完全忽略原始扩展名
   */
  private async processImage(file: Express.Multer.File): Promise<string> {
    // 1. magic bytes 二次校验：Sharp 仅能解析真实图片
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(file.buffer).metadata();
    } catch (err) {
      this.logger.error(
        `图片解析失败（非真实图片或已损坏）: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      throw new BadRequestException('文件不是有效的图片或已损坏');
    }

    // 2. 校验真实格式与声明的 mimetype 一致
    const formatMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const realMime = formatMap[metadata.format || ''] || '';
    if (!realMime || !this.allowedMimeTypes.includes(realMime)) {
      throw new BadRequestException(
        '文件实际内容与声明的类型不一致，或类型不被支持',
      );
    }

    // 3. 维度校验
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    if (width < this.minDimension || height < this.minDimension) {
      throw new BadRequestException(
        `图片尺寸过小，最小 ${this.minDimension}×${this.minDimension} 像素`,
      );
    }
    if (width > this.maxDimension || height > this.maxDimension) {
      throw new BadRequestException(
        `图片尺寸过大，最大 ${this.maxDimension}×${this.maxDimension} 像素`,
      );
    }

    // 4. 生成 UUID 文件名，统一 .jpg 扩展名
    const filename = `${uuidv4()}.jpg`;
    const filepath = `${this.uploadDir}/${filename}`;

    try {
      await sharp(file.buffer)
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside', // 保持比例，不裁剪
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(filepath);
    } catch (err) {
      this.logger.error(
        `图片处理失败: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      throw new BadRequestException('图片处理失败');
    }

    return filename;
  }

  private ensureUploadDir(): void {
    const absDir = (this.uploadDir.startsWith('/')
      ? this.uploadDir
      : `${process.cwd()}/${this.uploadDir}`
    ).replace(/\\/g, '/');
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true, mode: 0o750 });
      this.logger.log(`📁 创建上传目录: ${absDir}`);
    }
  }
}
