import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/public.decorator';
import { BusinessConfigService } from './business-config.service';
import { StorageService } from '../storage/storage.service';

@ApiTags('config')
@Controller('config')
export class PublicConfigController {
  constructor(
    private readonly svc: BusinessConfigService,
    private readonly storage: StorageService,
  ) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: '取所有 group 的当前值（公开，无需 token）' })
  getPublic(): Record<string, unknown> {
    return {
      ...this.svc.getAllForPublic(),
      defaultAvatarMaleUrl: this.storage.getDefaultAvatarUrls().male,
      defaultAvatarFemaleUrl: this.storage.getDefaultAvatarUrls().female,
    };
  }
}
