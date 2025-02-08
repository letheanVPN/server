// src/net/vpn/openvpn/server.ts
import { ProcessService } from '../../../process/service.ts';
import { Injectable } from '@danet/core';
import { ProcessInfo } from "../../../process/interface.ts";

@Injectable()
export class OpenvpnServer {
    private processService: ProcessService;

    constructor(processService: ProcessService) {
        this.processService = processService;
    }

    /**
     * Starts an OpenVPN server.
     *
     * @param configFile Path to the OpenVPN server configuration file.
     * @returns process info, after logging started
     */
    async start(configFile: string): Promise<ProcessInfo> {
        // Check if config file exists.
        try {
            await Deno.stat(configFile);
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                throw new Error(`OpenVPN config file not found: ${configFile}`);
            }
            throw error;
        }

        const { stdout, stderr } = this.processService.start('openvpn', ['--config', configFile]);

        // Use TextDecoderStream to decode output
        const decoder = new TextDecoderStream();
        const decodedStdout = stdout.pipeThrough(decoder);
        const decodedStderr = stderr.pipeThrough(decoder);

        // Log stdout and stderr
        this.readStream(decodedStdout, "stdout");
        this.readStream(decodedStderr, "stderr");

        return this.processService.info();
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
                    console.log(`[OpenVPN ${type}]: ${value}`);
                }
            }
        } catch (error) {
            console.error(`Error reading OpenVPN ${type}:`, error);
        } finally {
            reader.releaseLock();
        }
    }

    async getStatus(): Promise<ProcessInfo>{
        return this.processService.info();
    }
    /**
     * Stops the OpenVPN server.  Like the client, we kill the process.
     */
    stop(): boolean {
        return this.processService.stop();
    }

    /**
     * Generates a basic OpenVPN server configuration file.  This is a *very*
     * basic configuration and should be customized for production use.
     *
     * @param options Configuration options.
     * @returns The generated configuration file content as a string.
     */
    async generateServerConfig(options: {
        port: number;
        proto: 'udp' | 'tcp';
        dev: string;
        ca: string;
        cert: string;
        key: string;
        dh: string;
        server: string;
        ifconfigPoolPersist?: string;
        keepalive?: string;
        cipher?: string; // Added cipher option
        compLzo?: boolean; // Added compLzo option
        persistKey?: boolean;
        persistTun?: boolean;
        status?: string;
        verb?: number;
        clientToClient?:boolean;
        pushRoutes?: string[];
    }): Promise<string> {
        const {
            port,
            proto,
            dev,
            ca,
            cert,
            key,
            dh,
            server,
            ifconfigPoolPersist,
            keepalive,
            cipher,
            compLzo,
            persistKey,
            persistTun,
            status,
            verb,
            clientToClient,
            pushRoutes,
        } = options;

        let config = `
port ${port}
proto ${proto}
dev ${dev}
ca ${ca}
cert ${cert}
key ${key}
dh ${dh}
server ${server}
`;
        if (ifconfigPoolPersist) {
            config += `ifconfig-pool-persist ${ifconfigPoolPersist}\n`;
        }

        if (keepalive) {
            config += `keepalive ${keepalive}\n`;
        }
        if (cipher) {
            config += `cipher ${cipher}\n`
        }

        if (compLzo) {
            config += `comp-lzo\n`;
        }

        if (persistKey) {
            config += `persist-key\n`;
        }

        if (persistTun) {
            config += `persist-tun\n`;
        }

        if (status) {
            config += `status ${status}\n`;
        }

        if (verb) {
            config += `verb ${verb}\n`;
        }
        if (clientToClient) {
            config += `client-to-client\n`;
        }
        if(pushRoutes && pushRoutes.length > 0){
            for (const route of pushRoutes){
                config += `push "route ${route}"\n`
            }
        }

        return config.trim(); //trim to remove extra spaces and lines.
    }

    /**
     * Generates client configuration.
     *
     * @param options Configuration options.
     * @returns The generated configuration file content as a string.
     */
    async generateClientConfig(options: {
        remote: string; // remote ip and port
        dev: string;
        proto: 'udp' | 'tcp';
        ca: string;     // Path to CA file
        cert: string;   // Path to client certificate
        key: string;   // Path to client key
        cipher?: string;   // Encryption cipher
        compLzo?: boolean; // Enable LZO compression
        resolvRetry?: string; //Resolv retry option
        nobind?: boolean, // Nobind option
        persistKey?: boolean, // Persist key option
        persistTun?: boolean, // Persist tun option
        verb?: number;
    }): Promise<string> {
        const {
            remote,
            dev,
            proto,
            ca,
            cert,
            key,
            cipher,
            compLzo,
            resolvRetry,
            nobind,
            persistKey,
            persistTun,
            verb
        } = options;

        let config = `
client
dev ${dev}
proto ${proto}
remote ${remote}
ca ${ca}
cert ${cert}
key ${key}
`;
        if(resolvRetry){
            config += `resolv-retry ${resolvRetry}\n`
        }
        if(nobind){
            config += `nobind\n`
        }
        if (cipher) {
            config += `cipher ${cipher}\n`;
        }
        if (compLzo) {
            config += `comp-lzo\n`;
        }
        if (persistKey) {
            config += `persist-key\n`;
        }
        if (persistTun) {
            config += `persist-tun\n`;
        }

        if (verb) {
            config += `verb ${verb}\n`;
        }

        return config.trim();
    }
    /**
     * Generates Diffie-Hellman parameters. This can take a long time.
     * @param keySize the key size, default is 2048
     * @returns The path to the generated DH parameters file.
     */
    async generateDhParams(dhFile: string, keySize: number = 2048): Promise<void> {
        const { code, stderr } = await this.processService.run('openssl', ['dhparam', '-out', dhFile, String(keySize)]);
        if (code !== 0) {
            const decoder = new TextDecoder();
            throw new Error(`Failed to generate DH parameters: ${decoder.decode(stderr)}`);
        }
    }

    /**
     * Generates an OpenVPN key pair (certificate and private key).
     *
     * @param caCert Path to the CA certificate.
     * @param caKey Path to the CA key.
     * @param certFile Path to save the generated certificate.
     * @param keyFile Path to save the generated private key.
     * @param  options openssl options, such as -days 365
     * @param type server | client.  This sets the -extfile argument.
     */

    async generateKeyPair(
        caCert: string,
        caKey: string,
        certFile: string,
        keyFile: string,
        options: string[],
        type: 'server' | 'client' = 'client',
    ): Promise<void> {
        const extfile = type === 'server' ? 'server.ext' : 'client.ext'; // temporary file
        const extFileContent = type === 'server'
            ? 'extendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE'
            : 'extendedKeyUsage=clientAuth\nbasicConstraints=CA:FALSE';

        await Deno.writeTextFile(extfile, extFileContent);

        const genKeyArgs = ['genrsa', '-out', keyFile, '4096'];
        let { code: genKeyCode, stderr: genKeyStderr } = await this.processService.run('openssl', genKeyArgs);
        if (genKeyCode !== 0) {
            await Deno.remove(extfile);
            const decoder = new TextDecoder();
            throw new Error(`Failed to generate key: ${decoder.decode(genKeyStderr)}`);
        }

        const reqArgs = [
            'req',
            '-new',
            '-key',
            keyFile,
            '-out',
            `${certFile}.csr`, // Temporary CSR file
            '-subj',
            '/CN=OpenVPN', // You might want to make this configurable
            ...options,
        ];

        let {code: reqCode, stderr: reqStderr} = await this.processService.run('openssl', reqArgs);
        if (reqCode !== 0) {
            await Deno.remove(extfile);
            await Deno.remove(keyFile);
            const decoder = new TextDecoder();
            throw new Error(`Failed to generate CSR: ${decoder.decode(reqStderr)}`);
        }


        const x509Args = [
            'x509',
            '-req',
            '-in',
            `${certFile}.csr`,
            '-CA',
            caCert,
            '-CAkey',
            caKey,
            '-CAcreateserial',
            '-out',
            certFile,
            '-extfile',
            extfile,
            ...options
        ];

        let { code: x509Code, stderr:x509Stderr } = await this.processService.run('openssl', x509Args);

        // Clean up the temporary CSR file and extfile
        await Deno.remove(`${certFile}.csr`);
        await Deno.remove(extfile);

        if (x509Code !== 0) {
            const decoder = new TextDecoder();
            throw new Error(`Failed to sign certificate: ${decoder.decode(x509Stderr)}`);
        }
    }

    /**
     * Generates a Certificate Authority (CA) certificate and key.
     *
     * @param caCert Path to save the CA certificate.
     * @param caKey Path to save the CA key.
     * @param options openssl options
     * @returns
     */
    async generateCA(caCert: string, caKey: string, options: string[] = []): Promise<void> {

        const genKeyArgs = ['genrsa', '-out', caKey, '4096'];
        let {code: genKeyCode, stderr: genKeyStderr} = await this.processService.run('openssl', genKeyArgs);
        if(genKeyCode !== 0){
            const decoder = new TextDecoder();
            throw new Error(`Failed generating CA Key: ${decoder.decode(genKeyStderr)}`);
        }

        const reqArgs = [
            'req',
            '-x509',
            '-new',
            '-nodes',
            '-key',
            caKey,
            '-out',
            caCert,
            '-subj',
            '/CN=OpenVPN-CA', // Common Name for the CA.  Change as needed.
            ...options,
        ];
        let { code: reqCode, stderr: reqStderr } = await this.processService.run('openssl', reqArgs);
        if(reqCode !== 0){
            const decoder = new TextDecoder();
            throw new Error(`Failed generating CA : ${decoder.decode(reqStderr)}`);
        }
    }
}
