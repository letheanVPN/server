// test.ts
import { WireguardClient } from './src/net/vpn/wireguard/client.ts';
import { WireguardServer } from './src/net/vpn/wireguard/server.ts';
import { ProcessService } from './src/process/service.ts';
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

const serverInterfaceName = 'wg-test-server';
const clientInterfaceName = 'wg-test-client';
const serverConfigFile = `${serverInterfaceName}.conf`;
const clientConfigFile = `${clientInterfaceName}.conf`

Deno.test("Wireguard - Full Server/Client Connection Test", async (t) => {
    const processService = new ProcessService();
    const wireguardServer = new WireguardServer(processService);
    const wireguardClient = new WireguardClient(processService);
    const serverAddress = '10.8.0.1/24';
    const clientAddress = '10.8.0.2/24';
    const serverListenPort = 51820;
    const serverAllowedIPs = '0.0.0.0/0';
    const clientAllowedIPs = '0.0.0.0/0';
    const serverEndpoint = `127.0.0.1:${serverListenPort}` // Assuming localhost for testing
    const dns = '8.8.8.8';

    let serverPrivateKey: string;
    let serverPublicKey: string;
    let clientPrivateKey: string;
    let clientPublicKey: string;

    await t.step("Generate Server Keys", async () => {
        serverPrivateKey = await wireguardServer.generatePrivateKey();
        serverPublicKey = await wireguardServer.generatePublicKey(serverPrivateKey);
        assertEquals(typeof serverPrivateKey, 'string');
        assertEquals(typeof serverPublicKey, 'string');
        assertEquals(serverPrivateKey.length > 0, true);
        assertEquals(serverPublicKey.length > 0, true);
    });

    await t.step("Generate Client Keys", async () => {
        clientPrivateKey = await wireguardServer.generatePrivateKey();
        clientPublicKey = await wireguardServer.generatePublicKey(clientPrivateKey);
        assertEquals(typeof clientPrivateKey, 'string');
        assertEquals(typeof clientPublicKey, 'string');
        assertEquals(clientPrivateKey.length > 0, true);
        assertEquals(clientPublicKey.length > 0, true);
    });

    await t.step("Create Server Config", async () => {
        const serverConfig = await wireguardServer.generateServerConfig(
            serverInterfaceName,
            serverPrivateKey,
            serverAddress,
            serverListenPort,
            clientPublicKey,
            clientAllowedIPs,
            clientAddress
        );
        await Deno.writeTextFile(serverConfigFile, serverConfig);
        const fileContent = await Deno.readTextFile(serverConfigFile);
        assertEquals(fileContent, serverConfig);
    });

    await t.step("Create Client Config", async () => {
        const clientConfig = await wireguardServer.generateClientConfig(
            clientInterfaceName,
            clientPrivateKey,
            clientAddress,
            dns,
            serverPublicKey,
            serverEndpoint,
            serverAllowedIPs,
        );
        await Deno.writeTextFile(clientConfigFile, clientConfig);
        const fileContent = await Deno.readTextFile(clientConfigFile);
        assertEquals(fileContent, clientConfig);
    });

    await t.step("Start Server", async () => {
        try {
            const processInfo = await wireguardServer.start(serverConfigFile);
            console.log(processInfo);
            assertEquals(typeof processInfo.time_started, 'number');
        } catch(error){
            if (error.message.includes("Unable to access interface")) {
                console.warn("Skipping test: 'wg-quick up' failed. This may be due to missing WireGuard tools or permissions.");
            }else{
                // If it's another error, re-throw it to fail the test
                throw error;
            }
        }
    });

    await t.step("Start Client", async () => {
        try{
            const processInfo = await wireguardClient.connect(clientConfigFile);
            console.log(processInfo)
            assertEquals(typeof processInfo.time_started, 'number');
        }catch (error) {
            if (error.message.includes("Unable to access interface")) {
                console.warn("Skipping test: 'wg-quick up' failed. This may be due to missing WireGuard tools or permissions.");
            }else{
                // If it's another error, re-throw it to fail the test
                throw error;
            }
        }
    });

    await t.step("Stop Client", async () => {
        try{
            const result = await wireguardClient.disconnect(clientConfigFile);
            assertEquals(result, true, "disconnect() should return true on success");
        }catch (error) {
            if (error.message.includes("Unable to access interface")) {
                console.warn("Skipping test: 'wg-quick up' failed. This may be due to missing WireGuard tools or permissions.");
            }else{
                // If it's another error, re-throw it to fail the test
                throw error;
            }
        }
    });

    await t.step("Stop Server", async () => {
        try{
            const result = await wireguardServer.stop(serverConfigFile);
            assertEquals(result, true, "disconnect() should return true on success");
        }catch (error) {
            if (error.message.includes("Unable to access interface")) {
                console.warn("Skipping test: 'wg-quick up' failed. This may be due to missing WireGuard tools or permissions.");
            }else{
                // If it's another error, re-throw it to fail the test
                throw error;
            }
        }
    });

    // Cleanup config files
    await cleanupTestConfigFile(serverConfigFile);
    await cleanupTestConfigFile(clientConfigFile);
});

const cleanupTestConfigFile = async (filePath: string) => {
    try{
        await Deno.remove(filePath);
    }catch (error){
        if(!(error instanceof Deno.errors.NotFound)){
            throw error;
        }
    }

};
