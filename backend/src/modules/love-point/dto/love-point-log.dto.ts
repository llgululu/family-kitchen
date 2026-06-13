import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { LovePointChangeType } from '@family-kitchen/shared';
import { PaginationQueryDto } from '../../../common/pagination.dto';

const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export class LovePointLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '变动类型筛选',
    enum: Object.values(LovePointChangeType),
    isArray: true,
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(LovePointChangeType, { each: true })
  changeTypes?: string[];

  @ApiPropertyOptional({
    description: '查个人钱包 (me) 还是家庭账本 (family)',
    enum: ['me', 'family'],
    default: 'me',
  })
  @IsOptional()
  @IsEnum(['me', 'family'])
  scope?: 'me' | 'family' = 'me';
}

export class LovePointLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  changeAmount!: number;

  @ApiProperty()
  balanceAfter!: number;

  @ApiProperty({ enum: Object.values(LovePointChangeType) })
  changeType!: string;

  @ApiProperty({ nullable: true })
  sourceOrderId!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class LovePointBalanceDto {
  @ApiProperty({ description: '我的当前余额' })
  balance!: number;

  @ApiProperty({ description: '本月累计赚（仅 user 维度）' })
  monthEarned!: number;

  @ApiProperty({ description: '本月累计花（仅 user 维度）' })
  monthSpent!: number;
}
