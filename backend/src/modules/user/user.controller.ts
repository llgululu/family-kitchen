import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BindCredentialsDto } from './dto/bind-credentials.dto';
import { UserDto } from './dto/user.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';

@ApiTags('User')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  getMe(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.userService.findById(user.userId);
  }

  @Get('me/chef-level')
  @ApiOperation({ summary: '获取我的厨师等级' })
  getChefLevel(@CurrentUser() user: AuthUser) {
    return this.userService.getChefLevel(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新个人资料（昵称 / 头像 / 签名）' })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<UserDto> {
    return this.userService.updateProfile(user.userId, dto);
  }

  @Patch('me/credentials')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '绑定手机号 + 设置登录密码（开通 H5 账号密码登录）' })
  bindCredentials(
    @CurrentUser() user: AuthUser,
    @Body() dto: BindCredentialsDto,
  ): Promise<UserDto> {
    return this.userService.bindCredentials(user.userId, dto);
  }

  @Delete('me')
  @ApiOperation({
    summary: '注销账号（软删 + 退出家庭，30 天后由 cron 硬删）',
  })
  deleteMe(@CurrentUser() user: AuthUser): Promise<{ deletedAt: Date }> {
    return this.userService.deleteMe(user.userId);
  }

  @Get('me/notification-prefs')
  @ApiOperation({ summary: '获取通知偏好设置' })
  getNotificationPrefs(@CurrentUser() user: AuthUser): Promise<Record<string, boolean>> {
    return this.userService.getNotificationPrefs(user.userId);
  }

  @Patch('me/notification-prefs')
  @ApiOperation({ summary: '更新通知偏好设置' })
  updateNotificationPrefs(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, boolean>,
  ): Promise<Record<string, boolean>> {
    return this.userService.updateNotificationPrefs(user.userId, body);
  }
}
