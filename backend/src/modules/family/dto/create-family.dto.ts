import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFamilyDto {
  @ApiProperty({ description: '小厨房名称', minLength: 1, maxLength: 60 })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ description: '纪念日（YYYY-MM-DD）' })
  @IsOptional()
  @IsDateString()
  anniversaryDate?: string;
}
