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

@ValidatorConstraint({ name: 'recipeDifficultyOrder', async: false })
class DifficultyMaxGtMin implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as RecipeLimitsSchema;
    return obj.DIFFICULTY_MAX > obj.DIFFICULTY_MIN;
  }
  defaultMessage(): string {
    return 'DIFFICULTY_MAX 必须大于 DIFFICULTY_MIN';
  }
}

export class RecipeLimitsSchema {
  @ApiProperty({ minimum: 5, maximum: 100 })
  @IsInt()
  @Min(5)
  @Max(100)
  NAME_MAX_LENGTH!: number;

  @ApiProperty({ minimum: 50, maximum: 5000 })
  @IsInt()
  @Min(50)
  @Max(5000)
  NOTES_MAX_LENGTH!: number;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  MAX_IMAGES!: number;

  @ApiProperty({ description: '锁定为 1', enum: [1] })
  @IsInt()
  @Equals(1)
  DIFFICULTY_MIN!: number;

  @ApiProperty({ minimum: 2, maximum: 10 })
  @IsInt()
  @Min(2)
  @Max(10)
  @Validate(DifficultyMaxGtMin)
  DIFFICULTY_MAX!: number;
}
