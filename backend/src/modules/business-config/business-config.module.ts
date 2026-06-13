import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessConfigService } from './business-config.service';
import { BusinessConfigController } from './business-config.controller';
import { PublicConfigController } from './public-config.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [BusinessConfigController, PublicConfigController],
  providers: [BusinessConfigService],
  exports: [BusinessConfigService],
})
export class BusinessConfigModule {}
