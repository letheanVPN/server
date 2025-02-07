import {DevicesAndroidService} from "./service.ts";
import { join } from "@std/path/join";
import { assertEquals } from '@std/assert';
const androidService = new DevicesAndroidService();
Deno.test('Android - Fetch Win/Lin/Mac ADB', async () => {
    await androidService.downloadADB(Deno.cwd())
    if(Deno.build.os === "windows"){
        assertEquals(Deno.statSync(join(Deno.cwd(), "platform-tools", "adb.exe")).isFile, true, "ADB should be downloaded");
    }else{
        assertEquals(Deno.statSync(join(Deno.cwd(), "platform-tools", "adb")).isFile, true, "ADB should be downloaded");
    }
});

Deno.test({
    name: 'Android - List Files',
    ignore: Object.keys(androidService.devices())[0] == undefined,
    async fn() {
        const files = await androidService.ls("/sdcard/DCIM/Camera")
        assertEquals(files.length > 0, true);
    }
})
