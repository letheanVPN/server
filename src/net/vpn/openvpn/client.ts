// src/net/vpn/openvpn/client.ts
import { ProcessService } from '../../../process/service.ts'; // Adjust path as needed
import { Injectable } from '@danet/core';
import { ProcessInfo } from "../../../process/interface.ts";

@Injectable()
export class OpenvpnClient {
    private processService: ProcessService;

    constructor(processService: ProcessService) {
        this.processService = processService;
    }

    /**
     * Starts an OpenVPN client connection.
     *
     * @param configFile Path to the OpenVPN configuration file (.ovpn).
     * @returns ProcessInfo of the started process, after setting up stdout/stderr listeners
     */
    async connect(configFile: string): Promise<ProcessInfo> {
        // Check if the config file exists.
        try {
            await Deno.stat(configFile);
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                throw new Error(`OpenVPN config file not found: ${configFile}`);
            } else {
                throw error;
            }
        }

        const { stdout, stderr } = this.processService.start('openvpn', ['--config', configFile]);

        // Use TextDecoderStream to decode the output streams.
        const decoder = new TextDecoderStream();
        const decodedStdout = stdout.pipeThrough(decoder);
        const decodedStderr = stderr.pipeThrough(decoder);

        // Asynchronously read and log stdout and stderr.
        this.readStream(decodedStdout, 'stdout');
        this.readStream(decodedStderr, 'stderr');

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
     * Stops the OpenVPN client connection.  OpenVPN doesn't have a graceful
     * disconnect command; we must kill the process.
     */
    stop(): boolean {
        return this.processService.stop();
    }
}
