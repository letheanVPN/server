import {assertEquals} from "https://deno.land/std@0.129.0/testing/asserts.ts";
import {ProcessService} from "./service.ts";
const denoConfig = JSON.parse(Deno.readTextFileSync('deno.json'));
const currentVersion = denoConfig.version;


const process = new ProcessService();
Deno.test("ProcessService.run('build/server -V')", async () => {
    const { code, stdout, stderr } = await process.run('build/server.exe', ['-V'])
    assertEquals(code, 0);
    assertEquals(new TextDecoder().decode(stdout).includes(currentVersion), true);
    console.log(process.list())
});

Deno.test("Process Persistence", async () => {
    // first check if the process is not in the list, its procedural
    assertEquals(process.list().includes("build/server.exe"), false, "Process list should not include server.exe");
    const { code, stdout, stderr } = await process.run('build/server.exe', ['-V'])
    assertEquals(code, 0);
    assertEquals(process.list().includes("build/server.exe"), false, "Process list should not include server.exe");
});

Deno.test("ProcessService.add()/remove()", async () => {
    process.add('build/server.exe', ['-V'])
    assertEquals(process.list().includes("build/server.exe"), true, "Process list should include server.exe");
    process.remove('build/server.exe')
    assertEquals(process.list().includes("build/server.exe"), false, "Process list should not include server.exe");
});
