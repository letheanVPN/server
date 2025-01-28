
import {QuasiSaltService} from "./quasi-salt.service.ts";

import {QuasiSaltHashDTO, QuasiSaltHashVerifyDTO} from "./interface.ts";
// import {HashDTO} from "./interface.ts";
import { Body, Controller, Post } from '@danet/core';
import { Tag } from '@danet/swagger/decorators';

@Tag("Cryptography")
@Controller("crypto/hash")
export class HashController {

    constructor(private quasi: QuasiSaltService) {}
    @Post("quasi-salted-hash")
    createQuasiSalt(@Body() body: QuasiSaltHashDTO): string {
        return this.quasi.hash(body.input);
    }

    @Post("quasi-salted-hash-verify")
    verifyQuasiSalt(@Body() body: QuasiSaltHashVerifyDTO): boolean {
        return this.quasi.verify(body.input, body.hash);
    }

    // @Post("sha256")
    // sha256(@Body() body: HashDTO): string {
    //     return this.hash.hash(body.input, "SHA-256");
    // }
    //
    // @Post("sha384")
    // sha384(@Body() body: HashDTO): string {
    //     return this.hash.hash(body.input, "SHA-384");
    // }
    //
    // @Post("sha512")
    // sha512(@Body() body: HashDTO): string {
    //     return this.hash.hash(body.input, "SHA-512");
    // }
}
