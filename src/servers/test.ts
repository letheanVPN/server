// src/servers/appium.test.ts
import { ServersAppiumService } from "./appium.ts";
import { DeviceService } from "../devices/service.ts";
import { DevicesAndroidService } from "../devices/android/service.ts";
import { assertEquals, assertRejects, assert } from '@std/assert';
import { delay } from "jsr:@std/async/delay";
import { join } from "jsr:@std/path";
import { Browser } from 'npm:webdriverio@^8.27.0';
import TcpListener = Deno.TcpListener;

// Mock the DeviceService.  This is *crucial* for isolating the AppiumService tests.
class MockDeviceService extends DeviceService {
    constructor() {
        super();
    }
    override async listDevices() { // Add 'override'
        return { "emulator-5554": "device" }; // Return a mock device
    }
    override getDeviceService() { // Add 'override'
        return {
            setupAndroidEnvironment: async () => {
                // Mock implementation.  Doesn't actually need to *do* anything in this test.
                return { ANDROID_HOME: "mock_path", ANDROID_SDK_ROOT: "mock_path", PATH: "mock_path" };
            },
            invokeADB: () => {
                return "1" //for sys.boot_completed
            },
            devices: () => {
                return {"emulator-5554": "device"}
            }
        } as any;
    }

}

const testDownloadPath = join(Deno.cwd(), "test_adb_appium");
// Clean up before tests
try {
    Deno.removeSync(testDownloadPath, { recursive: true });
} catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
    }
}

Deno.test("AppiumService - starts and stops Appium server", async () => {
    const deviceService = new MockDeviceService();
    const appiumService = new ServersAppiumService(deviceService, testDownloadPath);

    try {
        await appiumService.startServer();
        // Check if Appium is running (basic check - you could expand this).
        assert(appiumService.port !== undefined, "Appium port should be assigned.");
        // More robust check would be to make an HTTP request to the Appium status endpoint.

        //check if the port is now in use
        assert(await appiumService.isPortInUse(appiumService.port) === true, "The Appium port should be in use.");

    } finally {
        await appiumService.stopServer();
        // Check if Appium is *not* running.
        assertEquals(appiumService["appiumProcess"], undefined, "Appium process should be undefined after stopping.");
        //check the port is free
        assert(await appiumService.isPortInUse(appiumService.port) === false, "The Appium port should be free.");
    }
});

Deno.test("AppiumService - handles Appium startup failure", async () => {
    const deviceService = new MockDeviceService();
    const appiumService = new ServersAppiumService(deviceService, testDownloadPath);

    // Force Appium to fail by using an invalid command.
    // deno-lint-ignore no-explicit-any
    (appiumService as any).startServer = async () => {
        const command = new Deno.Command("invalid-command-for-appium", {
            stdout: "piped",
            stderr: "piped",
        });
        // deno-lint-ignore no-explicit-any
        (appiumService as any).appiumProcess = command.spawn();
        await delay(1000); // Short wait for the command to try running.
    };


    await assertRejects(
        async () => {
            await appiumService.startServer();
        },
        Error, // Expect *some* kind of error
        "Appium server should fail to start", // Check for a relevant part of the error message.
    );
    // Ensure stopServer() is called even on failure.
    await appiumService.stopServer() //ensure it is cleaned up.
});

Deno.test("AppiumService - uses available port", async () => {
    const deviceService = new MockDeviceService();
    const appiumService = new ServersAppiumService(deviceService, testDownloadPath);

    // 1. Start a dummy process to occupy the default port (4723).
    let dummyProcess: Deno.TcpListener | undefined; // Corrected type
    try {
        dummyProcess = Deno.listen({ port: 4723, transport: "tcp" }) as Deno.TcpListener;
    } catch(e) {
        //port is in use.
    }
    try {
        await appiumService.startServer();
        assert(appiumService.port !== 4723, "Appium should use a different port than the default.");
        assert(appiumService.port > 0, "Port should have a positive value");
    } finally {
        await appiumService.stopServer();
        if(dummyProcess){
            dummyProcess.close();
        }
        await delay(1000)
    }
    //Test again to see if the port is free
    const appiumService2 = new ServersAppiumService(deviceService, testDownloadPath);
    try {
        await appiumService2.startServer();
        assertEquals(appiumService2.port, 4723, "Appium should have original port")
    } finally {
        await appiumService2.stopServer();
    }
});

Deno.test({
    name: "AppiumService - openApp and closeApp",
    ignore: true, // No device connected
    fn: async () => {
        const deviceService = new DeviceService();
        // Use the *real* DeviceService here!
        const appiumService = new ServersAppiumService(deviceService, testDownloadPath);
        const devices = await deviceService.listDevices("android");
        const serial = Object.keys(devices)[0];
        const testPackageName = "com.android.settings"; // Use a *real* package name

        try{
            await appiumService.startServer();
            // Open the app.
            await appiumService.openApp(testPackageName, serial);

            // Add assertions here to verify the app is open (e.g., using UiAutomator).
            // You'll need a driver instance for this.  This part depends on your specific UI.

            // Close the app.
            await appiumService.closeApp(testPackageName, serial);
            await delay(1000)
        }finally{
            await appiumService.stopServer()
        }
        // Add assertions here to verify the app is closed (if possible without a driver).
    },
});

Deno.test({
    name: "AppiumService - openApp and closeApp (with driver)",
    ignore: false, // No device connected
    fn: async () => {
        const testDownloadPath = "/path/to/your/downloads";
        const testPackageName = "com.android.settings";
        const deviceService = new MockDeviceService();
        // Use the *real* DeviceService here!
        const appiumService = new ServersAppiumService(deviceService, testDownloadPath);


        // Example script: Find and click an element.
        const myScript = async (appiumService: ServersAppiumService, serial: string) => {
                // Wait for the app to load (you might adjust the timeout).
                await delay(3000);

                // Example Appium Interaction using UiAutomator (Android)
                try{
                    const element = await appiumService.findElement("accessibilityId", "Network & internet");
                    if (!element)
                    {
                        throw new Error(`Could not find the element Network & internet`)
                    }
                    await appiumService.click(element.ELEMENT);
                }catch(error){
                    console.error("Element interaction failed:", error)
                    throw error; // Re-throw to ensure the main function knows about the failure.
                }
                await delay(2000); // Wait after clicking.
        }

        try {
            await appiumService.openAndCloseApp({
                deviceType: "android",
                packageName: testPackageName,
                downloadPath: testDownloadPath,
                script: myScript,  // Pass the script here
            });
            console.log("App opened, script executed, and app closed successfully!");
        } catch (error) {
            console.error("An error occurred (with script):", error);
        }
    },
});
