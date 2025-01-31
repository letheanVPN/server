import { Module } from '@danet/core';
import { AppController } from './app.controller.ts';
import {FsLocalController} from "./fs/local/controller.ts";
import {FsLocalService} from "./fs/local/service.ts";
import {ProcessController} from "./process/controller.ts";
import {ProcessService} from "./process/service.ts";

@Module({
  controllers: [AppController, FsLocalController, ProcessController],
  imports: [],
  injectables: [FsLocalService,ProcessService],
})
export class AppModule {}
