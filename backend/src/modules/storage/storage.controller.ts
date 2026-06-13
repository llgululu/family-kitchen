import { BadRequestException, Controller, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { StorageService, MAX_UPLOAD_SIZE_BYTES } from './storage.service';
import { StorageCategory, UploadResultDto } from './dto/upload-result.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({
    summary: '图片上传',
    description: `multipart/form-data 单文件上传。最大 ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB，仅图片。返回可直接展示的 URL。`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'category',
    enum: Object.values(StorageCategory),
    required: false,
    description: '业务分类，决定文件路径前缀',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async upload(
    @CurrentUser() user: AuthUser,
    @Req() req: FastifyRequest,
    @Query('category') categoryQuery?: string,
  ): Promise<UploadResultDto> {
    const file = await req.file();
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE',
        message: '请提供 file 字段',
      });
    }
    const buffer = await file.toBuffer();
    const category: StorageCategory = isValidCategory(categoryQuery)
      ? categoryQuery
      : StorageCategory.OTHER;

    return this.storageService.uploadFile({
      buffer,
      mimeType: file.mimetype,
      originalFilename: file.filename,
      category,
      userId: user.userId,
    });
  }
}

function isValidCategory(v: string | undefined): v is StorageCategory {
  return !!v && (Object.values(StorageCategory) as string[]).includes(v);
}
