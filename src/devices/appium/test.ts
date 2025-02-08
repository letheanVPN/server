// appium.test.ts (Final Version)
import { Browser } from 'npm:webdriverio@^8.27.0';
import { assertEquals, assert } from '@std/assert';
import { DevicesAppiumService } from "./service.ts";
import { DevicesAndroidService } from "../android/service.ts";
import { join } from "@std/path/join";
import { delay } from "@std/async/delay";

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'My Phone', //  Replace with *your* device name
    // 'appium:platformVersion': '12.0',
    'appium:newCommandTimeout': 600,
    //'appium:app': '/path/to/your/app.apk',
    //'appium:appPackage': 'com.example.app',
    //'appium:appActivity': 'com.example.app.MainActivity',
};

let driver: Browser | undefined;
const androidService = new DevicesAndroidService();
const testDownloadPath = join(Deno.cwd(), "test_adb");
const appiumService = new DevicesAppiumService(androidService, testDownloadPath);

Deno.test({
    name: 'Press Home Button (Appium)',
    async fn() {
        try {
            appiumService.startServer().catch((error) => {
                console.error("Error starting Appium server:", error);
                throw error;
            });

            await delay(5000);

            const devices = androidService.devices();
            const serial = Object.keys(devices)[0];
            driver = await appiumService.getDriver(capabilities, serial);
            assert(driver, "Driver should be defined if Appium connected.");

            await driver.pressKeyCode(3);
            await driver.pause(500);
            const current_package = await driver.getCurrentPackage();
            assertEquals(current_package, "com.sec.android.app.launcher"); // Or "com.android.launcher3"

        } catch (error) {
            console.error("Error in test:", error);
            throw error;
        } finally {
            if (driver) {
                try {
                    await driver.deleteSession();
                } catch (deleteError) {
                    console.error("Error deleting session:", deleteError);
                }
                driver = undefined;
            }
            await appiumService.stopServer();
        }
    },
});
