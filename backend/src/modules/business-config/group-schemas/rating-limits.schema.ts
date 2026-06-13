import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsInt,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'ratingMaxGtMin', async: false })
class RatingMaxGtMin implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as RatingLimitsSchema;
    return obj.MAX > obj.MIN;
  }
  defaultMessage(): string {
    return 'MAX 必须大于 MIN';
  }
}

export class RatingLimitsSchema {
  @ApiProperty({ description: '锁定为 1', enum: [1] })
  @IsInt()
  @Equals(1)
  MIN!: number;

  @ApiProperty({ minimum: 3, maximum: 10 })
  @IsInt()
  @Min(3)
  @Max(10)
  @Validate(RatingMaxGtMin)
  MAX!: number;

  @ApiProperty({ minimum: 50, maximum: 5000 })
  @IsInt()
  @Min(50)
  @Max(5000)
  COMMENT_MAX_LENGTH!: number;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @IsInt()
  @Min(0)
  @Max(10)
  MAX_IMAGES!: number;
}
