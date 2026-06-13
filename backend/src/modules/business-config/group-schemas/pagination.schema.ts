import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'maxGteDefault', async: false })
class MaxPageGteDefault implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as PaginationSchema;
    return obj.MAX_PAGE_SIZE >= obj.DEFAULT_PAGE_SIZE;
  }
  defaultMessage(): string {
    return 'MAX_PAGE_SIZE 必须 >= DEFAULT_PAGE_SIZE';
  }
}

export class PaginationSchema {
  @ApiProperty({ minimum: 5, maximum: 100 })
  @IsInt()
  @Min(5)
  @Max(100)
  DEFAULT_PAGE_SIZE!: number;

  @ApiProperty({ minimum: 10, maximum: 1000 })
  @IsInt()
  @Min(10)
  @Max(1000)
  @Validate(MaxPageGteDefault)
  MAX_PAGE_SIZE!: number;
}
