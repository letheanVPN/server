import {OpenPGPService} from "./service.ts";
import {QuasiSaltService} from "../hash/quasi-salt.service.ts";
import {FsLocalService} from "../../fs/local/service.ts";
import { assertEquals, assertStringIncludes } from '@std/assert';


const filesystem = new FsLocalService();
const salt = new QuasiSaltService();
const openpgp = new OpenPGPService(filesystem, salt);

Deno.test("CryptOpenPGP.createKeyPair", async () => {
    const key: any = await openpgp.createKeyPair(
        "09f3b17c6fab2d948fb29a5ab9aaf9755fd24c3c146ed19795a85c446241ad89",
        "test",
    );

    assertStringIncludes(
        key.privateKey,
        "-----BEGIN PGP PRIVATE KEY BLOCK-----",
        "Private key is not valid",
    );
    assertStringIncludes(
        key.publicKey,
        "-----BEGIN PGP PUBLIC KEY BLOCK-----",
        "Public key is not valid",
    );
    assertStringIncludes(
        key.revocationCertificate,
        "-----BEGIN PGP PUBLIC KEY BLOCK-----",
        "Revocation certificate is not valid",
    );

    filesystem.write(
        "users/09f3b17c6fab2d948fb29a5ab9aaf9755fd24c3c146ed19795a85c446241ad89.lthn.key",
        key.privateKey,
    );
    filesystem.write(
        "users/09f3b17c6fab2d948fb29a5ab9aaf9755fd24c3c146ed19795a85c446241ad89.lthn.pub",
        key.publicKey,
    );
    filesystem.write(
        "users/09f3b17c6fab2d948fb29a5ab9aaf9755fd24c3c146ed19795a85c446241ad89.lthn.rev",
        key.revocationCertificate,
    );
});

Deno.test("CryptOpenPGP.getPublicKey", async () => {
    const publicKey = await openpgp.getPublicKey(
        "09f3b17c6fab2d948fb29a5ab9aaf9755fd24c3c146ed19795a85c446241ad89",
    );

    assertEquals(
        await publicKey.getPrimaryUser().then((data:any) => data.user.userID.userID),
        "09f3b17c6fab2d948fb29a5ab9aaf9755fd24c3c146ed19795a85c446241ad89",
        "OpenPGP Key is not for the test user",
    );
});

Deno.test("CryptOpenPGP.getPrivateKey", async () => {
    const privateKey = await openpgp.getPrivateKey(
        "09f3b17c6fab2d948fb29a5ab9aaf9755fd24c3c146ed19795a85c446241ad89",
        "test",
    );

    assertEquals(
        await privateKey.getPrimaryUser().then((data:any) => data.user.userID.userID),
        "09f3b17c6fab2d948fb29a5ab9aaf9755fd24c3c146ed19795a85c446241ad89",
        "OpenPGP Key is not for the test user",
    );
});

Deno.test("CryptOpenPGP.createServerKeyPair", async () => {
    const key: any = await openpgp.createServerKeyPair();
    assertEquals(
        filesystem.isFile("users/server.lthn.pub"),
        true,
    );
    assertEquals(
        filesystem.isFile("users/server.lthn.key"),
        true,
    );
    assertEquals(
        filesystem.isFile("users/server.lthn.rev"),
        true,
    );
});
