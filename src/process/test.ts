import {assertEquals  } from "jsr:@std/assert";
import { expect } from "jsr:@std/expect";
import {ProcessService} from "./service.ts";
import {ProcessManager} from "./manager.ts";

const denoConfig = JSON.parse(Deno.readTextFileSync('deno.json'));
const currentVersion = denoConfig.version;

const process = new ProcessService();
const processManager = new ProcessManager()

Deno.test("ProcessService.run('build/server -V')", async () => {
    const process = new ProcessService();
    const { code, stdout, stderr } = await process.run('build/server.exe', ['-V'])
    assertEquals(code, 0, "Exit code should be 0");
    assertEquals(process.info().args.includes("-V"), true, "Command Args should include -V");
    expect(process.info().time_added, "time_added should be greater than 0").toBeGreaterThan(0);
    expect(process.info().time_started, "time_started should be greater than 0").toBeGreaterThan(0);
    expect(process.info().time_stopped, "time_stopped should be greater than 0").toBeGreaterThan(0);
    assertEquals(new TextDecoder().decode(stdout).includes(currentVersion), true, "Stdout should include current version");
});

Deno.test("Process Add", async () => {
    // first check if the process is not in the list, its procedural
    const process = new ProcessService();
    process.add('build/server.exe', ['-V'])
    //console.log(process.info())
    assertEquals(process.info().command.endsWith("build/server.exe"), true, "Command should end with build/server.exe");
    assertEquals(process.info().args.includes("-V"), true, "Command should end with build/server.exe");
    expect(process.info().time_added, "time_added should be greater than 0").toBe(0);
    expect(process.info().time_started, "time_started should be greater than 0").toBe(0);
    expect(process.info().time_stopped, "time_stopped should be greater than 0").toBe(0);
    //assertEquals(process.list().includes("build/server.exe"), false, "Process list should not include server.exe");
});

