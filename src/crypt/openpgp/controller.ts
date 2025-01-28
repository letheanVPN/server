
import {OpenPGPService} from "./service.ts";
import {
    OpenPGPCreateKeyPairDTO,
    OpenPGPDecryptBYIDDTO,
    OpenPGPEncryptBYIDDTO, OpenPGPGetPublicKeyDTO,
    OpenPGPKeyPairDTO, OpenPGPSignBYIDDTO, OpenPGPVerifyBYIDDTO
} from "./interface.ts";
import { Tag } from '@danet/swagger/decorators';
import { Body, Controller, Post } from '@danet/core';
@Tag("Cryptography")
@Controller("crypto/openpgp")
export class OpenPGPController {

    constructor(private openpgp: OpenPGPService) {}

    @Post("generate-key-pair")
    async generateKeyPair(@Body() body: OpenPGPCreateKeyPairDTO): Promise<OpenPGPKeyPairDTO> {
        const keys = await this.openpgp.createKeyPair(body.name, body.passphrase);

        return {
            publicKey: keys.publicKey.toString(),
            privateKey: keys.privateKey.toString(),
            revocationCertificate: keys.revocationCertificate
        }
    }

    @Post("encrypt")
    async encrypt(@Body() body: OpenPGPEncryptBYIDDTO): Promise<string> {
        let passphrase = undefined;
        if(body.passphrase){
            passphrase = body.passphrase;
        }
        return await this.openpgp.encryptPGP(body.id, body.message, passphrase);
    }

    @Post("decrypt")
    async decrypt(@Body() body: OpenPGPDecryptBYIDDTO): Promise<string> {
        let signedBy = undefined;
        if(body.signedBy){
            signedBy = body.signedBy;
        }
        return await this.openpgp.decryptPGP(body.id, body.message, body.passphrase, signedBy);
    }

    @Post("sign")
    async sign(@Body() body: OpenPGPSignBYIDDTO): Promise<string> {
        return await this.openpgp.sign(body.message, body.id, body.passphrase);
    }

    @Post("verify")
    async verify(@Body() body: OpenPGPVerifyBYIDDTO): Promise<boolean> {
        return await this.openpgp.verify(body.message, body.id);
    }

    @Post("get-public-key")
    async getPublicKey(@Body() body: OpenPGPGetPublicKeyDTO): Promise<string> {
        return (await this.openpgp.getPublicKey(body.id)).armor().toString()
    }
}
