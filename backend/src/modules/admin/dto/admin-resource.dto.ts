import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus, FamilyStatus } from '@family-kitchen/shared';
import { PaginationQueryDto } from '../../../common/pagination.dto';

const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export class AdminFamilyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按家庭名 / 邀请码模糊搜索' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;

  @ApiPropertyOptional({
    description: '按状态筛选',
    enum: Object.values(FamilyStatus),
    isArray: true,
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(FamilyStatus, { each: true })
  statuses?: string[];
}

export class AdminFamilySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  memberCount!: number;

  @ApiProperty()
  orderCount!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class AdminFamilyDetailDto extends AdminFamilySummaryDto {
  @ApiProperty({ type: Object, isArray: true })
  members!: Array<{
    userId: string;
    nickname: string;
    avatarUrl: string | null;
    role: string;
    joinedAt: Date;
  }>;

  @ApiProperty({ type: Object, isArray: true })
  recentOrders!: Array<{
    id: string;
    status: string;
    createdAt: Date;
  }>;
}

export class AdminUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按昵称模糊搜索' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  search?: string;
}

export class AdminUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nickname!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true, enum: ['male', 'female'] })
  gender!: string | null;

  @ApiProperty({ nullable: true })
  currentFamilyId!: string | null;

  @ApiProperty()
  orderCount!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class AdminUserDetailDto extends AdminUserSummaryDto {
  @ApiProperty({ description: '脱敏手机号', nullable: true })
  phone!: string | null;

  @ApiProperty({ description: '个人签名', nullable: true })
  signature!: string | null;

  @ApiProperty({ description: '当前爱心币余额（最后一条流水的 balanceAfter）' })
  lovePointBalance!: number;

  @ApiProperty({ description: '解锁的徽章数' })
  achievementCount!: number;
}

export class AdminOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '按状态筛选',
    enum: Object.values(OrderStatus),
    isArray: true,
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(OrderStatus, { each: true })
  statuses?: string[];

  @ApiPropertyOptional({ description: '按家庭 ID 筛选' })
  @IsOptional()
  @IsString()
  familyId?: string;
}

export class AdminOrderSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  familyId!: string;

  @ApiProperty()
  customerUserId!: string;

  @ApiProperty()
  chefUserId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalLovePoints!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;
}

export class FreezeOrderDto {
  @ApiProperty({ description: '冻结原因' })
  @IsString()
  @MaxLength(200)
  reason!: string;
}
