// src/net/vpn/wireguard/server.ts
import { ProcessService } from '../../../process/service.ts'; // Adjust path as needed
import { Injectable } from '@danet/core';
import { ProcessInfo } from "../../../process/interface.ts";

@Injectable()
export class WireguardServer {
    private processService: ProcessService;

    constructor(processService: ProcessService) {
        this.processService = processService;
    }

    /**
     * Generates WireGuard server configuration and keys.
     *
     * @param interfaceName The name of the WireGuard interface (e.g., wg0).
     * @param privateKey Server's private key. If not provided, one is generated.
     * @param address Server's network address (e.g., 10.8.0.1/24).
     * @param listenPort The port WireGuard will listen on (e.g., 51820).
     * @param clientPublicKey The public key of the client connecting.
     * @param clientAllowedIPs The Allowed IPs for the client (e.g. 0.0.0.0/0)
     * @param clientAddress The address of the connecting client.
     * @returns The server configuration as a string.
     */
    async generateServerConfig(
        interfaceName: string,
        privateKey: string | undefined,
        address: string,
        listenPort: number,
        clientPublicKey: string,
        clientAllowedIPs: string,
        clientAddress: string,
    ): Promise<string> {
        if (!privateKey) {
            privateKey = await this.generatePrivateKey();
        }
        const publicKey = await this.generatePublicKey(privateKey);

        const config = `
[Interface]
Address = ${address}
ListenPort = ${listenPort}
PrivateKey = ${privateKey}
PostUp = iptables -A FORWARD -i ${interfaceName} -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i ${interfaceName} -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = ${clientPublicKey}
AllowedIPs = ${clientAllowedIPs}
    `;
        return config;
    }

    /**
     * Generates WireGuard client configuration and keys.
     *
     * @param interfaceName The name of the WireGuard interface (e.g., wg0).
     * @param privateKey Server's private key. If not provided, one is generated.
     * @param address Client's network address (e.g., 10.8.0.2/24).
     * @param dns DNS settings for the client
     * @param serverPublicKey The server public key.
     * @param serverEndpoint The public ip and port of the server.
     * @param serverAllowedIPs The Allowed IPs for the client (e.g. 0.0.0.0/0)
     * @returns The client configuration as a string.
     */
    async generateClientConfig(
        interfaceName: string,
        privateKey: string | undefined,
        address: string,
        dns: string,
        serverPublicKey: string,
        serverEndpoint: string,
        serverAllowedIPs: string,
    ): Promise<string> {
        if (!privateKey) {
            privateKey = await this.generatePrivateKey();
        }
        const publicKey = await this.generatePublicKey(privateKey);

        const config = `
    [Interface]
    PrivateKey = ${privateKey}
    Address = ${address}
    DNS = ${dns}

    [Peer]
    PublicKey = ${serverPublicKey}
    AllowedIPs = ${serverAllowedIPs}
    Endpoint = ${serverEndpoint}
        `;
        return config;
    }

    /**
     * Generates a WireGuard private key.
     *
     * @returns The generated private key as a string.
     */
    async generatePrivateKey(): Promise<string> {
        const { code, stdout, stderr } = await this.processService.run('wg', ['genkey']);
        if (code !== 0) {
            const decoder = new TextDecoder();
            throw new Error(`Failed to generate private key: ${decoder.decode(stderr)}`);
        }
        const decoder = new TextDecoder();
        return decoder.decode(stdout).trim();
    }

    /**
     * Generates a WireGuard public key from a private key.
     *
     * @param privateKey The private key.
     * @returns The generated public key as a string.
     */
    async generatePublicKey(privateKey: string): Promise<string> {
        const process = this.processService.start('wg', ['pubkey']);
        const encoder = new TextEncoder();
        const writer = process.stdout.getWriter();
        await writer.write(encoder.encode(privateKey));
        writer.close()
        const {code, stdout, stderr} = await this.processService.run('wg', ['pubkey']);
        if (code !== 0) {
            const decoder = new TextDecoder();
            throw new Error(`Failed to generate public key: ${decoder.decode(stderr)}`);
        }
        const decoder = new TextDecoder();
        return decoder.decode(stdout).trim();
    }
    /**
     * Starts the WireGuard connection using the provided configuration file.
     *
     * @param configFile Path to the WireGuard configuration file.
     * @returns Promise resolving to the process info or an error if the command fails.
     */
    async start(configFile: string): Promise<ProcessInfo> {
        // Check if the config file exists.  Important!
        try {
            await Deno.stat(configFile);
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                throw new Error(`WireGuard config file not found: ${configFile}`);
            } else {
                throw error; // Re-throw other errors
            }
        }

        const { stdout, stderr } = this.processService.start('wg-quick', ['up', configFile]);

        // Use TextDecoderStream to decode the output streams.
        const decoder = new TextDecoderStream();
        const decodedStdout = stdout.pipeThrough(decoder);
        const decodedStderr = stderr.pipeThrough(decoder);


        // Asynchronously read and log stdout and stderr.
        this.readStream(decodedStdout, "stdout");
        this.readStream(decodedStderr, "stderr");

        return this.processService.info();  //Returns info after we setup the process
    }

    /**
     * Stops the WireGuard connection associated with the provided configuration file.
     *
     * @param configFile Path to the WireGuard configuration file.
     * @returns A boolean if the process was stopped
     */
    async stop(configFile: string): Promise<boolean> {
        // Use `wg-quick down` to disconnect.
        const {code, stdout, stderr} = await this.processService.run('wg-quick', ['down', configFile]);
        if(code !== 0){
            const decoder = new TextDecoder();
            const error = decoder.decode(stderr);
            throw new Error(`Failed to disconnect with error code: ${code}, message: ${error}`);
        }
        return true;
    }

    /**
     * Reads and logs the output of a stream.
     *
     * @param stream The ReadableStream to read from.
     * @param type  'stdout' or 'stderr' - used for logging.
     */
    private async readStream(stream: ReadableStream<string>, type: 'stdout' | 'stderr') {
        const reader = stream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                if (value) {
                    console.log(`[WireGuard ${type}]: ${value}`);
                }
            }
        } catch (error) {
            console.error(`Error reading WireGuard ${type}:`, error);
        } finally {
            reader.releaseLock();
        }
    }
    async getStatus(): Promise<ProcessInfo>{
        return this.processService.info();
    }
}
