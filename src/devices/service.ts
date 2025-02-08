// src/devices/service.ts
import { DevicesAndroidService } from "./android/service.ts";
import { Device } from "./interfaces.ts";
import { join } from "jsr:@std/path";

export class DeviceService {
    private androidService: DevicesAndroidService;

    constructor() {
        this.androidService = new DevicesAndroidService();
    }

    getDeviceService(type: "android"): DevicesAndroidService { // Simplified
        switch (type) {
            case "android":
                return this.androidService;
            default:
                throw new Error(`Unsupported device type: ${type}`);
        }
    }

    async listDevices(type: "android" = "android"): Promise<Record<string, string>> {
        const deviceService = this.getDeviceService(type);
        const deviceList = await deviceService.devices();
        return deviceList;
    }
}
