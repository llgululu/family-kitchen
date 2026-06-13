import {
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  type ValidationArguments,
} from 'class-validator';
import { ConfigRegistry, type GroupKey } from '../modules/business-config/config-registry';

@ValidatorConstraint({ name: 'maxLengthFromConfig', async: false })
export class MaxLengthFromConfig implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return true;
    const [g, f] = args.constraints as [GroupKey, string];
    return value.length <= ConfigRegistry.getInstance().getNumber(g, f);
  }
  defaultMessage(args: ValidationArguments): string {
    const [g, f] = args.constraints as [GroupKey, string];
    return `${args.property} 长度不能超过 ${ConfigRegistry.getInstance().getNumber(g, f)}`;
  }
}

@ValidatorConstraint({ name: 'minFromConfig', async: false })
export class MinFromConfig implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'number') return true;
    const [g, f] = args.constraints as [GroupKey, string];
    return value >= ConfigRegistry.getInstance().getNumber(g, f);
  }
  defaultMessage(args: ValidationArguments): string {
    const [g, f] = args.constraints as [GroupKey, string];
    return `${args.property} 不能小于 ${ConfigRegistry.getInstance().getNumber(g, f)}`;
  }
}

@ValidatorConstraint({ name: 'maxFromConfig', async: false })
export class MaxFromConfig implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'number') return true;
    const [g, f] = args.constraints as [GroupKey, string];
    return value <= ConfigRegistry.getInstance().getNumber(g, f);
  }
  defaultMessage(args: ValidationArguments): string {
    const [g, f] = args.constraints as [GroupKey, string];
    return `${args.property} 不能大于 ${ConfigRegistry.getInstance().getNumber(g, f)}`;
  }
}

@ValidatorConstraint({ name: 'arrayMaxSizeFromConfig', async: false })
export class ArrayMaxSizeFromConfig implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (!Array.isArray(value)) return true;
    const [g, f] = args.constraints as [GroupKey, string];
    return value.length <= ConfigRegistry.getInstance().getNumber(g, f);
  }
  defaultMessage(args: ValidationArguments): string {
    const [g, f] = args.constraints as [GroupKey, string];
    return `${args.property} 数组长度不能超过 ${ConfigRegistry.getInstance().getNumber(g, f)}`;
  }
}
