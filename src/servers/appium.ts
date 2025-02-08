// src/servers/appium.ts
import { DeviceService } from "../devices/service.ts";
import { join } from "jsr:@std/path";
import { remote, RemoteOptions, Browser } from 'npm:webdriverio@^8.27.0';
import { delay } from "jsr:@std/async/delay";
import { getAvailablePort } from 'jsr:@std/net';
interface AppiumAppControlOptions {
    deviceType: "android";
    packageName: string;
    downloadPath: string;
    deviceId?: string;
    script?: (appiumService: ServersAppiumService, serial: string) => Promise<void>; // Add the script parameter
}

export class ServersAppiumService {
    private appiumProcess: Deno.ChildProcess | undefined;
    private deviceService: DeviceService;
    private downloadPath: string;
    private stdoutReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    private stderrReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    port: number;

    constructor(deviceService: DeviceService, downloadPath: string) {
        this.deviceService = deviceService;
        this.downloadPath = downloadPath;
        this.port = 4723; // Default port
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
            return false;
        }
    }

    async startServer(): Promise<void> {
        this.port = await getAvailablePort({ preferredPort: this.port });
        console.log("Using Appium port:", this.port);

        const maxWaitTime = 30000;
        const startTime = Date.now();
        while (await this.isPortInUse(this.port)) {
            console.warn(`Port ${this.port} is in use, waiting...`);
            await delay(1000);
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error(`Port ${this.port} remained in use for too long.`);
            }
        }

        const env = await this.deviceService.getDeviceService("android").setupAndroidEnvironment(this.downloadPath);
        console.log("Environment:", env);

        let stdoutPromise: Promise<void> | undefined;
        let stderrPromise: Promise<void> | undefined;
        try {
            const command = new Deno.Command("appium", {
                args: [`--port`, `${this.port}`],
                env: env,
                stdout: "piped",
                stderr: "piped",
            });

            this.appiumProcess = command.spawn();

            let appiumStarted = false;
            stdoutPromise = (async () => {
                if (!this.appiumProcess) return;
                this.stdoutReader = this.appiumProcess.stdout.getReader();
                try {
                    while (true) {
                        const { done, value } = await this.stdoutReader.read();
                        if (done) break;
                        const output = new TextDecoder().decode(value);
                        console.log("Appium stdout:", output);
                        if (output.includes("Appium REST http interface listener started")) {
                            appiumStarted = true;
                        }
                    }
                } catch (e) {
                    console.error("Error reading Appium stdout:", e);
                }
            })();

            stderrPromise = (async () => {
                if (!this.appiumProcess) return;
                this.stderrReader = this.appiumProcess.stderr.getReader();
                try {
                    while (true) {
                        const { done, value } = await this.stderrReader.read();
                        if (done) break;
                        const output = new TextDecoder().decode(value);
                        console.error("Appium stderr:", output);
                    }
                } catch (e) {
                    console.error("Error reading Appium stderr:", e);
                }
            })();

            const timeout = 60000;
            const startTimeAppium = Date.now();
            while (!appiumStarted && Date.now() - startTimeAppium < timeout) {
                await delay(500);
            }

            if (!appiumStarted) {
                await this.stopServer();
                throw new Error(`Appium server failed to start within ${timeout / 1000} seconds.`);
            }
        } catch (error) {
            console.error("Failed to start Appium server:", error);
            throw error;
        } finally {
            if (stdoutPromise && stderrPromise) {
                await Promise.allSettled([stdoutPromise, stderrPromise]);
            }
        }
    }

    async stopServer(): Promise<void> {
        if (this.appiumProcess) {
            try {
                this.appiumProcess.kill("SIGTERM");
                await delay(1000);

                let appiumStatus;
                try {
                    appiumStatus = await this.appiumProcess.status;
                } catch (killError) {
                    console.error("Error checking Appium process status:", killError);
                }
                if (appiumStatus && !appiumStatus.success) {
                    console.warn("Appium process did not respond to SIGTERM, using SIGKILL.");
                    this.appiumProcess.kill("SIGKILL");
                    await delay(1000);
                }
                await this.appiumProcess.status;
            } catch (error) {
                console.warn("Error killing Appium process, probably already dead:", error);
            } finally {
                this.appiumProcess = undefined;
            }
        }

        if (this.stdoutReader) {
            try {
                await this.stdoutReader.cancel();
                await delay(100);
            } catch (_) {}
            this.stdoutReader.releaseLock();
            this.stdoutReader = undefined;
        }
        if (this.stderrReader) {
            try {
                await this.stderrReader.cancel();
                await delay(100);
            } catch (_) {}
            this.stderrReader.releaseLock();
            this.stderrReader = undefined;
        }
    }

    async waitForDeviceReady(serial?: string): Promise<void> {
        const timeout = 60000;
        const startTime = Date.now();
        const androidService = this.deviceService.getDeviceService("android");
        while (Date.now() - startTime < timeout) {
            try {
                const bootCompletedOutput = androidService.invokeADB({ serial }, "shell", "getprop", "sys.boot_completed").trim();
                if (bootCompletedOutput === '1') {
                    androidService.invokeADB({ serial }, "shell", "input", "keyevent", "82");
                    return;
                }
            } catch (error) {}
            await delay(1000);
        }

        throw new Error(`Device not ready after ${timeout / 1000} seconds.`);
    }

    async getDriver(capabilities: object, serial?: string): Promise<Browser> {
        await this.waitForDeviceReady(serial);
        const wdOpts: RemoteOptions = {
            hostname: '127.0.0.1',
            port: this.port,
            logLevel: 'info',
            capabilities,
        };

        const maxRetries = 3;
        const retryDelay = 2000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await remote(wdOpts);
            } catch (error) {
                if (error instanceof Error && error.message.includes("connection error") && i < maxRetries - 1) {
                    console.warn(`Connection attempt ${i + 1} failed. Retrying in ${retryDelay / 1000} seconds...`);
                    await delay(retryDelay);
                } else {
                    throw error;
                }
            }
        }
        throw new Error("Get driver failed")
    }


    async openApp(packageName: string, serial?: string): Promise<void> {
        const androidService = this.deviceService.getDeviceService("android");
        const output = androidService.invokeADB({ serial }, "shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1");
        if (output.toLowerCase().includes("error")) {
            throw new Error(`Failed to open app '${packageName}': ${output}`);
        }
    }


    async closeApp(packageName: string, serial?: string): Promise<void> {
        const androidService = this.deviceService.getDeviceService("android");
        // Use `am force-stop` to close the app.  This is the most reliable method.
        const output = androidService.invokeADB({ serial }, "shell", "am", "force-stop", packageName);

        if (output.toLowerCase().includes("error")) {
            throw new Error(`Failed to close app '${packageName}': ${output}`);
        }
    }

    /**
     *
     * @example
     * // --- Example Usage ---
     *
     * async function runTest() {
     *   const testDownloadPath = "/path/to/your/downloads";
     *   const testPackageName = "com.android.settings";
     *
     *   // Example script: Find and click an element.
     *   const myScript = async (appiumService: ServersAppiumService, serial: string) => {
     *     // Wait for the app to load (you might adjust the timeout).
     *     await delay(3000);
     *     // Example Appium Interaction using UiAutomator (Android)
     *     try{
     *       const element = await appiumService.findElement("accessibilityId", "Network & internet");
     *       if (!element)
     *       {
     *         throw new Error(`Could not find the element Network & internet`)
     *       }
     *       await appiumService.click(element.ELEMENT);
     *     }catch(error){
     *       console.error("Element interaction failed:", error)
     *       throw error; // Re-throw to ensure the main function knows about the failure.
     *     }
     *     await delay(2000); // Wait after clicking.
     *   };
     *
     *   // Example without a script:
     *   const noScriptExample = async () => {
     *     try {
     *       await openAndCloseApp({
     *         deviceType: "android",
     *         packageName: testPackageName,
     *         downloadPath: testDownloadPath,
     *       });
     *       console.log("App opened and closed successfully (no script)!");
     *     } catch (error) {
     *       console.error("An error occurred (no script):", error);
     *     }
     *   }
     *
     *   // Example with a script
     *   const withScriptExample = async () => {
     *       try {
     *         await openAndCloseApp({
     *           deviceType: "android",
     *           packageName: testPackageName,
     *           downloadPath: testDownloadPath,
     *           script: myScript,  // Pass the script here
     *         });
     *         console.log("App opened, script executed, and app closed successfully!");
     *       } catch (error) {
     *         console.error("An error occurred (with script):", error);
     *       }
     *   }
     *
     *   // Run either with script or without script example.
     *   // await noScriptExample();
     *   await withScriptExample();
     * }
     * @param options
     */
    async openAndCloseApp(options: AppiumAppControlOptions): Promise<void> {
        const { deviceType, packageName, downloadPath, deviceId, script } = options;

        const deviceService = new DeviceService();
        const appiumService = new ServersAppiumService(deviceService, downloadPath);

        try {
            const devices = await deviceService.listDevices(deviceType);
            if (Object.keys(devices).length === 0) {
                throw new Error(`No ${deviceType} devices found.`);
            }

            const serial = deviceId || Object.keys(devices)[0];
            if (!serial) {
                throw new Error(`Could not determine device ID for ${deviceType} device.`);
            }

            await appiumService.startServer();
            await appiumService.openApp(packageName, serial);

            // Execute the provided script, if any.  Pass the appiumService and serial.
            if (script) {
                await script(appiumService, serial);
            } else {
                //If no script is provided, keep waiting for the app to load completely.
                await delay(3000);
            }

            await appiumService.closeApp(packageName, serial);
            await delay(1000);

        } finally {
            await appiumService.stopServer();
        }
    }
}
