import { Module, EventEmitterModule } from "@danet/core";
import { ProcessController } from "./controller.ts";
import { ProcessService } from "./service.ts";
import {ProcessListener} from "./listener.ts";

@Module({
    controllers: [
        ProcessController
    ],
    injectables: [
        ProcessService,
        ProcessListener
    ],
    imports: [EventEmitterModule]
})
export class ProcessModule {}
