// src/devices/android/service.ts
import { join } from "jsr:@std/path";
import * as fflate from "npm:fflate@^0.8.0";
import { ensureDirSync  } from "jsr:@std/fs";
import { InvokeADBOptions, Device } from "../interfaces.ts";

export class DevicesAndroidService implements Device{

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

        const process = new Deno.Command(adbPath, {
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

        if (!archiveRequest.ok) {
            throw new Error(
                `Unable to download ${archiveRequest} at ${this.downloadURL}. ${archiveRequest.status} ${archiveRequest.statusText}`,
            );
        }

        const array = new Uint8Array(await archiveRequest.arrayBuffer());
        const decompressed = fflate.unzipSync(array, {});

        for (const [name, data] of Object.entries(decompressed)) {
            if (name === "platform-tools/") {
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
        options?: InvokeADBOptions,
    ) {
        return this.invokeADB(options, "pull", devicePath, hostPath);
    }

    uploadFile(
        devicePath: string,
        hostPath: string,
        options?: InvokeADBOptions,
    ) {
        return this.invokeADB(options, "push", hostPath, devicePath);
    }

    mkdir(
        devicePath: string,
        options?: InvokeADBOptions,
    ) {
        return this.invokeADB(options, "shell", `mkdir -p ${this.fixDevicePath(devicePath)}`);
    }

    rm(
        devicePath: string,
        options?: InvokeADBOptions,
    ) {
        return this.invokeADB(options, "shell", `rm -rf ${this.fixDevicePath(devicePath)}`);
    }

    ls(
        devicePath: string,
        options?: InvokeADBOptions,
    ) {
        return this.invokeADB(options, "shell", `ls ${this.fixDevicePath(devicePath)}`);
    }

    devices(
        options?: InvokeADBOptions,
    ) {
        const output = this.invokeADB(options, "devices");
        const devices: { [device: string]: string } = {};
        const lines = output.trim().split("\n");

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith("*")) {
                const parts = line.split(/\s+/);
                const deviceId = parts[0];
                const deviceStatus = parts[1].length > 1 ? parts[1] : "unknown";
                devices[deviceId] = deviceStatus;
            }
        }
        return devices;
    }
    async installApk(apkPath: string, options?: InvokeADBOptions): Promise<string> {
        return this.invokeADB(options, "install", apkPath);
    }

    async uninstallApk(packageName: string, options?: InvokeADBOptions): Promise<string> {
        return this.invokeADB(options, "uninstall", packageName);
    }
    async setupAndroidEnvironment(downloadPath?: string | null) {
        downloadPath ??= this.defaultADBPath();
        const platformToolsPath = join(downloadPath, "platform-tools");

        await this.downloadADB(downloadPath);

        Deno.env.set("ANDROID_HOME", downloadPath);
        Deno.env.set("ANDROID_SDK_ROOT", downloadPath);

        const currentPath = Deno.env.get("PATH") || "";
        let newPath: string;
        if (Deno.build.os === "windows") {
            newPath = `${currentPath};${platformToolsPath};`;
        } else {
            newPath = `${currentPath}:${platformToolsPath}:`;
        }
        Deno.env.set("PATH", newPath);
        return { ANDROID_HOME: downloadPath, ANDROID_SDK_ROOT: downloadPath, PATH: newPath };
    }
}
