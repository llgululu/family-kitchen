import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { JoinFamilyDto } from './dto/join-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { FamilyDto, InviteCodeDto } from './dto/family.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';

@ApiTags('Family')
@ApiBearerAuth()
@Controller('families')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  @ApiOperation({ summary: '创建小厨房' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFamilyDto): Promise<FamilyDto> {
    return this.familyService.create(user.userId, dto);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用邀请码加入小厨房' })
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinFamilyDto): Promise<FamilyDto> {
    return this.familyService.joinByCode(user.userId, dto.inviteCode);
  }

  @Get('me')
  @ApiOperation({ summary: '获取我的小厨房' })
  getMine(@CurrentUser() user: AuthUser): Promise<FamilyDto | null> {
    return this.familyService.getMyFamily(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新小厨房信息（仅创建者）' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateFamilyDto): Promise<FamilyDto> {
    return this.familyService.update(user.userId, dto);
  }

  @Post('me/invite-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '生成 / 刷新邀请码（仅创建者）' })
  refreshInvite(@CurrentUser() user: AuthUser): Promise<InviteCodeDto> {
    return this.familyService.generateInviteCode(user.userId);
  }

  @Post('me/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '退出小厨房' })
  leave(@CurrentUser() user: AuthUser): Promise<{ status: string; dissolvingAt: Date | null }> {
    return this.familyService.leave(user.userId);
  }
}
