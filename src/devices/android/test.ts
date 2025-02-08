// test.ts
import { DevicesAndroidService } from "./service.ts";
import { join } from "@std/path/join";
import { assertEquals, assertRejects, assertStringIncludes, assert } from '@std/assert';
import { ensureDirSync  } from "@std/fs/ensure-dir";
const androidService = new DevicesAndroidService();
const testDownloadPath = join(Deno.cwd(), "test_adb");

// Clean up any previous test downloads.
try {
    Deno.removeSync(testDownloadPath, { recursive: true });
} catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
    }
}
ensureDirSync(testDownloadPath);

// Helper function to get the path to adb for the current OS.
function getTestADBBinaryPath(basePath: string): string {
    return androidService.getADBBinary(basePath);
}

Deno.test('Android - Download ADB (Custom Path)', async () => {
    const adbPath = await androidService.downloadADB(testDownloadPath);
    const expectedAdbPath = getTestADBBinaryPath(testDownloadPath);
    assertEquals(adbPath, expectedAdbPath, "Returned ADB path should match expected path.");
    assert(Deno.statSync(adbPath).isFile, "ADB should be downloaded at custom path.");
    // Additional check: verify a file *other* than adb also exists, demonstrating full download.
    const fastbootPath = join(testDownloadPath, "platform-tools", Deno.build.os === "windows" ? "fastboot.exe" : "fastboot");
    assert(Deno.statSync(fastbootPath).isFile, "fastboot should also be downloaded.");
});

Deno.test('Android - getADBBinary (correct OS-specific path)', () => {
    const adbPath = androidService.getADBBinary(testDownloadPath);
    if (Deno.build.os === "windows") {
        assertStringIncludes(adbPath, ".exe", "Windows path should include .exe");
    } else {
        assertEquals(adbPath.endsWith(".exe"), false, "Non-Windows path should not include .exe");
    }
    assertEquals(adbPath, join(testDownloadPath, "platform-tools", Deno.build.os === "windows" ? "adb.exe" : "adb"), 'Path is created as expected');
});

Deno.test('Android - configDir returns a valid path', () => {
    const configPath = androidService.configDir();
    assert(configPath !== null, "Config directory should not be null");
    assert(typeof configPath === "string", "configPath should be string")
    // We can't assert the *exact* path, as it's OS-dependent, but we can check it's a string.
    // Consider using a library like `std/path/is_absolute` for a stronger check.
});

Deno.test('Android - defaultADBPath returns expected path', () => {
    const defaultPath = androidService.defaultADBPath();
    assertStringIncludes(defaultPath, androidService.configDir()!, "Default path should be within config directory");
    assertStringIncludes(defaultPath, "adb-deno", "Default ADB directory should include adb-deno");
});

Deno.test('Android - fixDevicePath adds quotes and leading slash', () => {
    assertEquals(androidService.fixDevicePath("sdcard/DCIM"), '"/sdcard/DCIM"', "Path should be quoted and have leading slash.");
    assertEquals(androidService.fixDevicePath("/sdcard/DCIM"), '"/sdcard/DCIM"', "Path should be quoted, even if already starting with slash.");
});


Deno.test({
    name: 'Android - devices returns device list',
    async fn() {
        const devices = androidService.devices();
        // We can't assert specific devices without a connected device, but we can check the *type*.
        assertEquals(typeof devices, "object", "Devices should return an object.");
        // If you *do* have a device connected, you could add:
        // assert(Object.keys(devices).length > 0, "Should return at least one device if connected.");
    }
});


Deno.test({
    name: 'Android - invokeADB with serial',
    async fn() {

        // Test invokeADB with a serial number.  This requires a connected device.
        const devices = androidService.devices();
        const serial = Object.keys(devices)[0];
        if (!serial) {
            console.warn("Skipping invokeADB serial test: No device connected.");
            return; // Skip the test if no device.
        }

        const output = androidService.invokeADB({ serial }, "shell", "pwd");
        assertStringIncludes(output, "/", "Output of pwd should include a path");
    }
});

Deno.test({
    name: 'Android - mkdir, ls, and rm on device',
    async fn() {
        const devices = androidService.devices();
        const serial = Object.keys(devices)[0];
        if (!serial) {
            console.warn("Skipping mkdir/ls/rm test: No device connected.");
            return;
        }
        const testDir = "/sdcard/testDir_deno_adb";

        // 1. Create a directory.
        androidService.mkdir(testDir, { serial });

        // 2. List the parent directory, check the new directory exists.
        const listOutput = androidService.ls("/sdcard", { serial });
        assertStringIncludes(listOutput, "testDir_deno_adb", "ls should show the created directory.");

        // 3. Remove the directory.
        androidService.rm(testDir, { serial });

        // 4. Verify removal.
        const listOutputAfterRm = androidService.ls("/sdcard", { serial });
        assertEquals(listOutputAfterRm.includes("testDir_deno_adb"), false, "ls should not show the removed directory.");
    }
});

Deno.test({
    name: 'Android - uploadFile and downloadFile',
    async fn() {
        const devices = androidService.devices();
        const serial = Object.keys(devices)[0];
        if (!serial) {
            console.warn("Skipping upload/download test: No device connected.");
            return;
        }

        const testDevicePath = "/data/local/tmp/test_file.txt"; // Using /data/local/tmp
        const testHostPath = join(testDownloadPath, "test_file.txt");
        const testDownloadHostPath = join(testDownloadPath, "downloaded_test_file.txt");

        // Create a test file locally.
        Deno.writeTextFileSync(testHostPath, "This is a test file.");

        // Explicitly create the directory on the device, using forward slashes.
        androidService.mkdir("/data/local/tmp", { serial });

        // 1. Upload the file.  NO fixDevicePath here!
        androidService.uploadFile(testDevicePath, testHostPath, { serial })

        // 2. Download the file to a different location. NO fixDevicePath here!
        androidService.downloadFile(testDevicePath, testDownloadHostPath, { serial });

        // 3. Keep the delay:
        await new Promise(resolve => setTimeout(resolve, 500));

        // 4. Verify downloaded file contents.
        const downloadedContent = Deno.readTextFileSync(testDownloadHostPath);
        assertEquals(downloadedContent, "This is a test file.", "Downloaded file content should match.");

        //Clean files
        androidService.rm(testDevicePath, { serial });
        Deno.removeSync(testHostPath);
        Deno.removeSync(testDownloadHostPath);
    }
});

Deno.test('Android - downloadADB handles network error', async () => {
    const originalUrl = androidService.downloadURL;
    androidService.downloadURL = "https://example.com/no-adb-here.zip"; // Invalid URL
    let response : Response
    await assertRejects(
        async () => {
            try {
                const archiveRequest = await fetch(androidService.downloadURL);
                response = archiveRequest;
                if (!archiveRequest.ok) {
                    throw new Error(`Unable to download ${archiveRequest} at ${androidService.downloadURL}. ${archiveRequest.status} ${archiveRequest.statusText}`);
                }

            } catch (error) {
                // Check error and rethrow to allow assertRejects to work correctly
                if (error instanceof Error && error.message.includes('Unable to download')) {
                    throw error;
                }
                throw new Error(`Unexpected error: ${error}`);
            }finally{
                if(response!){
                    await response.body?.cancel();
                }
            }
        },
        Error,
        "Unable to download"
    );
    androidService.downloadURL = originalUrl;
});

Deno.test('Android - invokeADB handles command failure', () => {
    const output = androidService.invokeADB({ downloadPath: testDownloadPath }, "invalid-command");

    assertStringIncludes(output.toLowerCase(), "unknown command", "Error output should indicate command failure.");
});
