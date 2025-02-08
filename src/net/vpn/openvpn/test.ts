// test.ts
import { OpenvpnClient } from './client.ts';
import { OpenvpnServer } from './server.ts';
import { ProcessService } from '../../../process/service.ts';
import { assertEquals, assertExists } from "@std/assert";

const testServerConfigFile = 'test-server.conf';
const testClientConfigFile = 'test-client.conf';
const testCaCert = 'ca.crt';
const testCaKey = 'ca.key';
const testServerCert = 'server.crt';
const testServerKey = 'server.key';
const testClientCert = 'client.crt';
const testClientKey = 'client.key';
const testDhFile = 'dh.pem';


Deno.test("OpenVPN - Full Server/Client Connection Test", async (t) => {
    const processService = new ProcessService();
    const openvpnServer = new OpenvpnServer(processService);
    const openvpnClient = new OpenvpnClient(processService);
    const port = 1194;
    const proto = 'udp';
    const dev = 'tun';  // Use 'tun' for routed, 'tap' for bridged
    const serverNetwork = '10.8.0.0 255.255.255.0';


    await t.step("Generate CA", async () => {
        await openvpnServer.generateCA(testCaCert, testCaKey, ['-days', '365']);
        // Check that the files were created.
        const caCertStat = await Deno.stat(testCaCert);
        const caKeyStat = await Deno.stat(testCaKey);
        assertExists(caCertStat);
        assertExists(caKeyStat);
    });

    await t.step("Generate Server Key Pair", async () => {
        await openvpnServer.generateKeyPair(testCaCert, testCaKey, testServerCert, testServerKey,['-days', '365'], 'server');
        const serverCertStat = await Deno.stat(testServerCert);
        const serverKeyStat = await Deno.stat(testServerKey);
        assertExists(serverCertStat);
        assertExists(serverKeyStat);

    });
    await t.step("Generate Client Key Pair", async () => {
        await openvpnServer.generateKeyPair(testCaCert, testCaKey, testClientCert, testClientKey,['-days', '365'], 'client');
        const clientCertStat = await Deno.stat(testClientCert);
        const clientKeyStat = await Deno.stat(testClientKey);
        assertExists(clientCertStat);
        assertExists(clientKeyStat);

    });

    await t.step("Generate DH Parameters", async() => {
        await openvpnServer.generateDhParams(testDhFile, 2048);
        const dhStat = await Deno.stat(testDhFile);
        assertExists(dhStat)
    })

    await t.step("Create Server Config", async () => {
        const serverConfig = await openvpnServer.generateServerConfig({
            port,
            proto,
            dev,
            ca: testCaCert,
            cert: testServerCert,
            key: testServerKey,
            dh: testDhFile,
            server: serverNetwork,
            ifconfigPoolPersist: 'ipp.txt',
            keepalive: '10 120',
            cipher: 'AES-256-CBC',  // Use a strong cipher
            compLzo: true,
            persistKey: true,
            persistTun: true,
            status: 'openvpn-status.log',
            verb: 3, // Adjust verbosity as needed
            clientToClient: true,
            pushRoutes: ['192.168.1.0 255.255.255.0']
        });
        await Deno.writeTextFile(testServerConfigFile, serverConfig);
        assertExists(serverConfig);
    });

    await t.step("Create Client Config", async () => {
        const clientConfig = await openvpnClient.generateClientConfig({
            remote: `127.0.0.1 ${port}`, // Connect to localhost for testing
            dev,
            proto,
            ca: testCaCert,
            cert: testClientCert,
            key: testClientKey,
            cipher: 'AES-256-CBC',
            compLzo: true,
            resolvRetry: 'infinite',
            nobind: true,
            persistKey: true,
            persistTun: true,
            verb: 3

        });
        await Deno.writeTextFile(testClientConfigFile, clientConfig);
        assertExists(clientConfig)
    });

    await t.step("Start OpenVPN Server", async () => {
        try{
            const serverInfo = await openvpnServer.start(testServerConfigFile);
            assertExists(serverInfo);
            assertExists(serverInfo.time_started);
            // Give the server a little time to start up.
            await new Promise(resolve => setTimeout(resolve, 1000));
        }catch(error){
            if (error.message.includes("Cannot open TUN/TAP dev")) {
                console.warn("Skipping OpenVPN Server test: TUN/TAP device not available.");
            }else{
                throw error;
            }
        }

    });

    await t.step("Start OpenVPN Client", async () => {
        try{
            const clientInfo = await openvpnClient.connect(testClientConfigFile);
            assertExists(clientInfo);
            assertExists(clientInfo.time_started)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }catch(error){
            if (error.message.includes("Cannot open TUN/TAP dev")) {
                console.warn("Skipping OpenVPN Client test: TUN/TAP device not available.");
            }else{
                throw error;
            }
        }

    });
    await t.step("Get OpenVPN Client Status", async() => {
        const status = await openvpnClient.getStatus();
        assertExists(status);
        assertExists(status.time_started);
    })

    await t.step("Get OpenVPN Server Status", async() => {
        const status = await openvpnServer.getStatus();
        assertExists(status);
        assertExists(status.time_started);
    })

    await t.step("Stop OpenVPN Client", async () => {
        const stopped = openvpnClient.stop();
        assertEquals(stopped, true, 'Client Stop');
    });

    await t.step("Stop OpenVPN Server", async () => {

        const stopped = openvpnServer.stop();
        assertEquals(stopped, true, 'Server Stop');
    });

    // Cleanup
    await Deno.remove(testServerConfigFile).catch(() => {});
    await Deno.remove(testClientConfigFile).catch(() => {});
    await Deno.remove(testCaCert).catch(() => {});
    await Deno.remove(testCaKey).catch(() => {});
    await Deno.remove(testServerCert).catch(() => {});
    await Deno.remove(testServerKey).catch(() => {});
    await Deno.remove(testClientCert).catch(() => {});
    await Deno.remove(testClientKey).catch(() => {});
    await Deno.remove(testDhFile).catch(() => {});
    await Deno.remove('ipp.txt').catch(() => {}); // Remove ifconfig-pool-persist file
    await Deno.remove('openvpn-status.log').catch(() => {});
});
