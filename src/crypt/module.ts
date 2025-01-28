import { Module } from "@danet/core";
import {QuasiSaltService} from "./hash/quasi-salt.service.ts";
import {OpenPGPService} from "./openpgp/service.ts";
import {OpenPGPController} from "./openpgp/controller.ts";

@Module({
    controllers: [
        // HashController,
        OpenPGPController
    ],
    injectables: [
        QuasiSaltService,
        // HashService,
        OpenPGPService
    ],
})
export class CryptographyModule {}
