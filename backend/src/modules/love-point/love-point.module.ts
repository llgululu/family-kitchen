import { Global, Module } from '@nestjs/common';
import { LovePointController } from './love-point.controller';
import { LovePointService } from './love-point.service';

@Global()
@Module({
  controllers: [LovePointController],
  providers: [LovePointService],
  exports: [LovePointService],
})
export class LovePointModule {}
