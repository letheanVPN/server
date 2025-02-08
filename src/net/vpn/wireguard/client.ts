// src/net/vpn/wireguard/client.ts
import { ProcessService } from '../../../process/service.ts'; // Adjust path as needed
import { Injectable } from '@danet/core';
import { ProcessInfo } from "../../../process/interface.ts";

@Injectable()
export class WireguardClient {
    private processService: ProcessService;

    constructor(processService: ProcessService) {
        this.processService = processService;
    }

    /**
     * Starts the WireGuard connection using the provided configuration file.
     *
     * @param configFile Path to the WireGuard configuration file.
     * @returns Promise resolving to the process info or an error if the command fails.
     */
    async connect(configFile: string): Promise<ProcessInfo> {
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
    async disconnect(configFile: string): Promise<boolean> {
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
