import { Module } from '@danet/core';
import { AppController } from './app.controller.ts';

@Module({
  controllers: [AppController],
  imports: [],
})
export class AppModule {}
