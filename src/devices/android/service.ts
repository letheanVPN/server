import { join } from "@std/path/join";
import { dirname } from "@std/path/dirname";
import * as fflate from "npm:fflate@^0.8.0";
import { ensureDirSync  } from "@std/fs/ensure-dir";
import {InvokeADBOptions} from "./interfaces.ts";

/**
 * Original code comes from: https://deno.land/x/adb_deno@0.1.5
 * I've made it work under Deno V2, and making framework integrations.
 */
export class DevicesAndroidService {

    protected adbDownloadURL =
        "https://dl.google.com/android/repository/platform-tools-latest-";
    protected archiveName = `${Deno.build.os}.zip`;
    public downloadURL = `${this.adbDownloadURL}${this.archiveName}`;

    configDir(): string | null {
        switch (Deno.build.os) {
            case "linux": {
                const xdg = Deno.env.get("XDG_CONFIG_HOME");
                if (xdg) return xdg;

                const home = Deno.env.get("HOME");
                if (home) return `${home}/.config`;
                break;
            }

            case "darwin": {
                const home = Deno.env.get("HOME");
                if (home) return `${home}/Library/Preferences`;
                break;
            }

            case "windows":
                return Deno.env.get("APPDATA") ?? null;
        }

        return null;
    }

    fixDevicePath(p: string) {
        if (!p.startsWith("/")) p = `/${p}`;

        return `"${p}"`;
    }

    defaultADBPath() {
        return join(this.configDir()!, "adb-deno");
    }

    invokeADB(options?: InvokeADBOptions, ...args: string[]) {
        const downloadPath = options?.downloadPath ?? this.defaultADBPath();
        const adbPath = this.getADBBinary(downloadPath);

        if (options?.serial !== undefined) {
            args = ["-s", options?.serial, ...args];
        }

        const process = new Deno.Command(adbPath,{
            args: args,
            stdout: "piped",
            stderr: "piped",
        });

        const output = process.outputSync();
        const stdout = new TextDecoder().decode(output.stdout);
        const stderr = new TextDecoder().decode(output.stderr);

        if (output.code !== 0) {
            return stderr;
        }

        return stdout;
    }

    async downloadADB(downloadPath?: string | null) {
        downloadPath ??= this.defaultADBPath();

        const archiveRequest = await fetch(this.downloadURL);

        if (!archiveRequest.ok)
            throw new Error(`Unable to download ${archiveRequest} at ${this.downloadURL}. ${archiveRequest.status} ${archiveRequest.statusText}`);

        const array = new Uint8Array(await archiveRequest.arrayBuffer());
        const decompressed = fflate.unzipSync(array, {});

        for (const [name, data] of Object.entries(decompressed)) {
            if(name === "platform-tools/"){
                ensureDirSync(join(downloadPath, "platform-tools"));
                continue;
            }

            const finalPath = join(downloadPath, name);
            await Deno.writeFile(finalPath, data);
        }

        return this.getADBBinary(downloadPath);
    }

    getADBBinary(p: string) {
        let bin = join(p, "platform-tools", "adb");
        if (Deno.build.os == "windows") {
            bin = `${bin}.exe`;
        }

        return bin;
    }

    downloadFile(
        devicePath: string,
        hostPath: string,
        options?: InvokeADBOptions
    ) {
        return this.invokeADB(options, "pull", devicePath, hostPath);
    }

    uploadFile(
        devicePath: string,
        hostPath: string,
        options?: InvokeADBOptions
    ) {
        return this.invokeADB(options, "push", hostPath, devicePath);
    }

    mkdir(
        devicePath: string,
        options?: InvokeADBOptions
    ) {
        return this.invokeADB(options, "shell", `mkdir -p ${this.fixDevicePath(devicePath)}`);
    }

    rm(
        devicePath: string,
        options?: InvokeADBOptions
    ) {
        return this.invokeADB(options, "shell", `rm -rf ${this.fixDevicePath(devicePath)}`);
    }

    ls(
        devicePath: string,
        options?: InvokeADBOptions
    ) {
        return this.invokeADB(options, "shell", `ls ${this.fixDevicePath(devicePath)}`);
    }

    devices(
        options?: InvokeADBOptions
    ) {
        const output = this.invokeADB(options, "devices");
        const devices: { [device: string]: string } = {};
        const lines = output.trim().split("\n");

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line &&!line.startsWith("*")) {
                const parts = line.split(/\s+/);
                const deviceId = parts[0]; // Use the first element
                const deviceStatus = parts[1].length > 1? parts[1]: "unknown"; // Check if status exists
                devices[deviceId] = deviceStatus;
            }
        }
        //return JSON.stringify(devices, null, 2)
        return devices
    }

}
