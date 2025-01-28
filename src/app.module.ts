import { Module } from '@danet/core';
import { AppController } from './app.controller.ts';
import {FsLocalController} from "./fs/local/controller.ts";
import {FsLocalService} from "./fs/local/service.ts";

@Module({
  controllers: [AppController, FsLocalController],
  imports: [],
  injectables: [FsLocalService],
})
export class AppModule {}
