// src/servers/appium.ts
import { DevicesAndroidService } from "../devices/android/service.ts"; // Import DeviceService
import { join } from "jsr:@std/path";
import { remote, RemoteOptions, Browser } from 'npm:webdriverio@^8.27.0';
import { delay } from "jsr:@std/async/delay";
import { DeviceService } from "../devices/service.ts";
import { getAvailablePort } from 'jsr:@std/net'; // Import getAvailablePort

export class ServersAppiumService {
    private appiumProcess: Deno.ChildProcess | undefined;
    private deviceService: DeviceService; // Use DeviceService
    private downloadPath: string;
    private stdoutReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    private stderrReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    port: number;

    constructor(deviceService: DeviceService, downloadPath: string) {
        this.deviceService = deviceService; // Use DeviceService
        this.downloadPath = downloadPath
        this.port = 4723
    }
    async isPortInUse(port: number): Promise<boolean> {
        try {
            const command = Deno.build.os === "windows"
                ? new Deno.Command("netstat", { args: ["-ano"], stdout: "piped" })
                : new Deno.Command("lsof", { args: [`-i:${port}`, "-P", "-n"], stdout: "piped" });

            const { stdout } = await command.output();
            const output = new TextDecoder().decode(stdout);
            return Deno.build.os === "windows" ? output.includes(`:${port}`) : output.includes(`LISTEN`);
        } catch (error) {
            // If command fails, assume port is NOT in use (safer assumption).
            return false;
        }
    }

    async startServer(): Promise<void> {
        // Find an available port, starting with the default (4723).
        this.port = await getAvailablePort({ preferredPort: this.port });
        //console.log("Using Appium port:", this.port);

        // Check if the assigned port is *still* in use, and wait if necessary.
        const maxWaitTime = 30000; // 30 seconds
        const startTime = Date.now();
        while (await this.isPortInUse(this.port)) {
            console.warn(`Port ${this.port} is in use, waiting...`);
            await delay(1000); // Wait 1 second
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error(`Port ${this.port} remained in use for too long.`);
            }
        }

        // Use the DeviceService to set up the environment.  This is more flexible.
        const env = await this.deviceService.getDeviceService("android").setupAndroidEnvironment(this.downloadPath);
        //console.log("Environment:", env);
        let stdoutPromise: Promise<void> | undefined;
        let stderrPromise: Promise<void> | undefined;
        try {
            const command = new Deno.Command("appium", {
                args: [`--port`, `${this.port}`], // Use the assigned port
                env: env,
                stdout: "piped",
                stderr: "piped",
            });

            this.appiumProcess = command.spawn();

            // Asynchronously read stdout and stderr.
            let appiumStarted = false;
            stdoutPromise = (async () => {
                if(!this.appiumProcess){return}
                this.stdoutReader = this.appiumProcess.stdout.getReader();
                try {
                    while (true) {
                        const { done, value } = await this.stdoutReader.read();
                        if (done) {
                            break;
                        }
                        const output = new TextDecoder().decode(value);
                        //console.log("Appium stdout:", output);
                        if (output.includes("Appium REST http interface listener started")) {
                            appiumStarted = true;
                        }
                    }
                } catch (e) {
                    console.error("Error reading Appium stdout:", e);
                }
            })();

            stderrPromise = (async () => {
                if(!this.appiumProcess){return}
                this.stderrReader = this.appiumProcess.stderr.getReader();
                try {
                    while (true) {
                        const { done, value } = await this.stderrReader.read();
                        if (done) {
                            break;
                        }
                        const output = new TextDecoder().decode(value);
                        console.error("Appium stderr:", output); // Log stderr as errors
                    }
                } catch (e) {
                    console.error("Error reading Appium stderr:", e);
                }
            })();

            const timeout = 60000; // 60 seconds timeout
            const startTimeAppium = Date.now();
            while (!appiumStarted && Date.now() - startTimeAppium < timeout) {
                await delay(500); // Check every 500ms
            }

            if (!appiumStarted) {
                await this.stopServer(); // Clean up resources on failure
                throw new Error(`Appium server failed to start within ${timeout / 1000} seconds.`);
            }
        } catch (error) {
            console.error("Failed to start Appium server:", error);
            throw error;
        } finally{
            if(stdoutPromise && stderrPromise){
                await Promise.allSettled([stdoutPromise, stderrPromise]);
            }
        }
    }

    async stopServer(): Promise<void> {
        if (this.appiumProcess) {
            try {
                // Use SIGTERM always.  Handle Windows-specific behavior below.
                this.appiumProcess.kill("SIGTERM");
                await delay(1000); // Consistent delay

                // Check if still running and force kill if necessary.
                let appiumStatus;
                try {
                    appiumStatus = await this.appiumProcess.status;
                } catch (killError) {
                    // Log any unexpected errors.
                    console.error("Error checking Appium process status:", killError);
                }
                if (appiumStatus && !appiumStatus.success) {
                    console.warn("Appium process did not respond to SIGTERM, using SIGKILL.");
                    this.appiumProcess.kill("SIGKILL"); // Force kill
                    await delay(1000); // Consistent delay
                }
                await this.appiumProcess.status; // Final wait
            } catch (error) {
                //This error is now expected on windows
                console.warn("Error killing Appium process, probably already dead:", error);
            } finally {
                this.appiumProcess = undefined; // Clear process reference.
            }
        }

        if(this.stdoutReader){
            try{
                await this.stdoutReader.cancel();
                await delay(100) // Consistent delay
            }catch(_){}
            this.stdoutReader.releaseLock()
            this.stdoutReader = undefined
        }
        if(this.stderrReader){
            try{
                await this.stderrReader.cancel()
                await delay(100) // Consistent delay
            }catch(_){}
            this.stderrReader.releaseLock()
            this.stderrReader = undefined
        }
    }
    async waitForDeviceReady(serial?: string): Promise<void> {
        const timeout = 60000; // 60-second timeout
        const startTime = Date.now();
        const androidService = this.deviceService.getDeviceService("android")
        while (Date.now() - startTime < timeout) {
            try {
                // Check if sys.boot_completed is 1.
                const bootCompletedOutput = androidService.invokeADB({ serial }, "shell", "getprop", "sys.boot_completed").trim();
                if (bootCompletedOutput === '1') {
                    //check menu button works
                    androidService.invokeADB({ serial }, "shell", "input", "keyevent", "82")
                    return; // Device is ready!
                }
            } catch (error) {
                // Ignore errors and retry.  adb might not be fully available yet.
            }
            await delay(1000); // Wait 1 second
        }

        throw new Error(`Device not ready after ${timeout / 1000} seconds.`);
    }

    async getDriver(capabilities: object, serial?: string): Promise<Browser> {
        await this.waitForDeviceReady(serial);
        const wdOpts: RemoteOptions = {
            hostname: '127.0.0.1',
            port: this.port,  // Use the dynamically assigned port!
            logLevel: 'info',
            capabilities,
        };

        const maxRetries = 3;
        const retryDelay = 2000; // 2 seconds

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await remote(wdOpts); // Return directly on success
            } catch (error) {
                if (error instanceof Error && error.message.includes("connection error") && i < maxRetries - 1) {
                    console.warn(`Connection attempt ${i + 1} failed. Retrying in ${retryDelay / 1000} seconds...`);
                    await delay(retryDelay);
                } else {
                    // Re-throw if it's not a connection error, or if we've reached max retries.
                    throw error;
                }
            }
        }
        throw new Error("Get driver failed") //should never get here
    }
}
