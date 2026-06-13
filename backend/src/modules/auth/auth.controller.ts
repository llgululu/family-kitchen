import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { WxLoginDto, WxLoginResponseDto } from './dto/wx-login.dto';
import { PasswordLoginDto } from './dto/password-login.dto';
import { AdminLoginDto, AdminLoginResponseDto } from './dto/admin-login.dto';
import { Public } from '../../common/public.decorator';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wx-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '小程序：用 wx.login code 换 JWT' })
  wxLogin(@Body() dto: WxLoginDto): Promise<WxLoginResponseDto> {
    return this.authService.wxLogin(dto.code, dto.gender);
  }

  @Public()
  @Post('password-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'H5：手机号 + 密码登录 / 注册' })
  passwordLogin(@Body() dto: PasswordLoginDto): Promise<WxLoginResponseDto> {
    return this.authService.passwordLogin(dto.phone, dto.password, dto.gender);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '管理后台：账号密码登录' })
  adminLogin(@Body() dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    return this.authService.adminLogin(dto.username, dto.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '回显当前 JWT 解析出的认证上下文（用于 token 自检）' })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
