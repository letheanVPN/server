// Interface for common device operations
export interface Device {
    devices(): Promise<Record<string, string>> | Record<string, string>; // List connected devices
    // Add other common methods as needed, e.g.,:
    // start(): Promise<void>;
    // stop(): Promise<void>;
    // installApp(appPath: string): Promise<void>;
    // ...
}

// Options for invokeADB
export interface InvokeADBOptions {
    downloadPath?: string | null;
    serial?: string;
}
