import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import {
  LOVE_POINT_FORMULA,
  RUSH_LIMITS,
  ORDER_TIMING,
  RECIPE_LIMITS,
  FAMILY_LIMITS,
  RATING_LIMITS,
  PAGINATION,
} from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ALL_GROUP_KEYS, ConfigRegistry, type GroupKey } from './config-registry';
import { GROUP_DEFAULTS } from './group-defaults';
import { GROUP_SCHEMAS } from './group-schemas';

const WX_TEMPLATE_ENV_KEYS = {
  ORDER_ACCEPTED: 'WX_TMPL_ORDER_ACCEPTED',
  ORDER_SERVED: 'WX_TMPL_ORDER_SERVED',
  ORDER_RUSHED: 'WX_TMPL_ORDER_RUSHED',
  ACHIEVEMENT_UNLOCKED: 'WX_TMPL_ACHIEVEMENT_UNLOCKED',
  ANNIVERSARY_REMINDER: 'WX_TMPL_ANNIVERSARY_REMINDER',
} as const;

export type WxTemplateKey = keyof typeof WX_TEMPLATE_ENV_KEYS;

@Injectable()
export class BusinessConfigService implements OnModuleInit {
  private readonly logger = new Logger(BusinessConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.prisma.businessConfig.findMany();
    const present = new Map(
      rows.map((r) => [r.groupKey as GroupKey, r.value as Record<string, unknown>]),
    );

    for (const groupKey of ALL_GROUP_KEYS) {
      const dbValue = present.get(groupKey);
      const defaultValue = this.defaultForGroup(groupKey);

      if (!dbValue) {
        await this.prisma.businessConfig.upsert({
          where: { groupKey },
          create: { groupKey, value: defaultValue as never, schemaVersion: 1 },
          update: {},
        });
        ConfigRegistry.getInstance().set(groupKey, defaultValue);
        this.logger.log(`seeded ${groupKey}`);
        continue;
      }

      const missing: string[] = [];
      const merged: Record<string, unknown> = { ...dbValue };
      for (const key of Object.keys(defaultValue)) {
        if (!(key in dbValue)) {
          merged[key] = defaultValue[key];
          missing.push(key);
        }
      }
      if (missing.length > 0) {
        await this.prisma.businessConfig.update({
          where: { groupKey },
          data: { value: merged as never },
        });
        this.logger.log(`refilled ${groupKey} missing fields: ${missing.join(',')}`);
      }
      ConfigRegistry.getInstance().set(groupKey, merged);
    }
  }

  private defaultForGroup(groupKey: GroupKey): Record<string, unknown> {
    if (groupKey === 'wx_template_ids') {
      const out: Record<string, string> = {};
      for (const [k, envKey] of Object.entries(WX_TEMPLATE_ENV_KEYS)) {
        out[k] = this.config.get<string>(envKey, '') ?? '';
      }
      return out;
    }
    return { ...GROUP_DEFAULTS[groupKey] };
  }

  // ============ typed getters ============

  getLovePointFormula(): typeof LOVE_POINT_FORMULA {
    return ConfigRegistry.getInstance().get('love_point_formula') as never;
  }

  getRushLimits(): typeof RUSH_LIMITS {
    return ConfigRegistry.getInstance().get('rush_limits') as never;
  }

  getOrderTiming(): typeof ORDER_TIMING {
    return ConfigRegistry.getInstance().get('order_timing') as never;
  }

  getRecipeLimits(): typeof RECIPE_LIMITS {
    return ConfigRegistry.getInstance().get('recipe_limits') as never;
  }

  getFamilyLimits(): typeof FAMILY_LIMITS {
    return ConfigRegistry.getInstance().get('family_limits') as never;
  }

  getRatingLimits(): typeof RATING_LIMITS {
    return ConfigRegistry.getInstance().get('rating_limits') as never;
  }

  getPagination(): typeof PAGINATION {
    return ConfigRegistry.getInstance().get('pagination') as never;
  }

  getWxTemplateId(key: WxTemplateKey): string {
    return ConfigRegistry.getInstance().getString('wx_template_ids', key.toLowerCase());
  }

  getAiConfig(): Record<string, unknown> {
    return ConfigRegistry.getInstance().get('ai_config');
  }

  /** 获取环境变量 */
  getEnv(key: string, defaultValue: string = ''): string {
    return this.config.get<string>(key, defaultValue) ?? defaultValue;
  }

  getAllForPublic(): Record<GroupKey, Record<string, unknown>> {
    const out = {} as Record<GroupKey, Record<string, unknown>>;
    for (const k of ALL_GROUP_KEYS) {
      out[k] = ConfigRegistry.getInstance().get(k);
    }
    return out;
  }

  // ============ mutation + audit ============

  async update(
    groupKey: GroupKey,
    value: Record<string, unknown>,
    operatorId: string,
  ): Promise<Record<string, unknown>> {
    const SchemaClass = GROUP_SCHEMAS[groupKey];
    if (!SchemaClass) {
      throw new Error(`unknown group ${groupKey}`);
    }
    const instance = plainToInstance(SchemaClass, value);
    await validateOrReject(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    await this.prisma.$transaction(async (tx) => {
      const old = await tx.businessConfig.findUnique({ where: { groupKey } });
      if (!old) {
        throw new Error(`group ${groupKey} row missing — onModuleInit not run?`);
      }
      await tx.businessConfig.update({
        where: { groupKey },
        data: { value: value as never, updatedBy: operatorId },
      });
      await tx.businessConfigChange.create({
        data: {
          groupKey,
          oldValue: old.value as never,
          newValue: value as never,
          operatorId,
        },
      });
    });

    ConfigRegistry.getInstance().set(groupKey, value);
    return value;
  }

  async listChanges(params: { groupKey?: GroupKey; page: number; pageSize: number }): Promise<{
    items: unknown[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where = params.groupKey ? { groupKey: params.groupKey } : {};
    const [items, total] = await Promise.all([
      this.prisma.businessConfigChange.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: {
          operator: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.businessConfigChange.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }
}
