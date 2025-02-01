import { Injectable } from '@danet/core';
import {ProcessRequest} from "./interface.ts";


/**
 * Lethean ProcessManager handles all aspects of running external binaries
 * you need to provide the correct binary for the OS, all other host differences are handled for you
 * @example
 * ProcessManager.run(path.join(homeDir, 'Lethean', 'cli', exeFile),args,
 * {
 * 		key: exeFile,
 * 		stdErr: (stdErr: unknown) => console.log(stdErr),
 * 		stdIn: (stdIn: unknown) => console.log(stdIn),
 * 		stdOut: (stdOut: unknown) => console.log(stdOut)
 * 	} as ProcessInterface
 * 	);
 */
@Injectable()
export class ProcessService {
    /**
     * Turns on console.log with 1 or 0
     */
    private static debug = 0;

    /**
     * Keeps record of processes managed by the class
     */
    private static process: { [name: string]: any } = {};

    /**
     * Runs and returns a process output
     */
    async run(command: string, args?: string[]){
        this.add(command, args)
        const { code, stdout, stderr } = await ProcessService.process[command].output()
        if (code === 0) {
            this.remove(command);
        }
        return { code, stdout, stderr }

    }

    /**
     * Starts a long-running process
     */
    start(command: string, args?: string[]){
        if(ProcessService.process[command]){
            return true
        }
        this.add(command, args)
        return ProcessService.process[command].spawn()

    }

    add(command: string, args: string[] = []){
        ProcessService.process[command] = new Deno.Command(command, {args: args})
    }

    list(){
        return Object.keys(ProcessService.process)
    }

    /**
     * Sends a force quit to the src
     */
    public remove(key: string) {
        if (!ProcessService.process[key]) {
            throw new Error(`Can't find process ${key}`);
        }
        delete ProcessService.process[key];
    }

    /**
     * Creates a src record and then starts it...
     * to be expanded as you can do ProcessManager.startProcess('letheand.exe')
     * so starting right away is optional
     */
    startmm(command: string, args: any, options?: ProcessRequest) {
        if (!args) {
            console.log("No arguments passed to ProcessManager");
            return;
        }

        const cmdArgs = [command];

        for (const arg in args) {
            if (arg === "igd") {
                continue;
            }
            cmdArgs.push(args[arg]);
            // cmdArgs.push(
            //     "--" + arg.replace(/([A-Z])/g, (x) => "-" + x.toLowerCase()) +
            //     (args[arg].length > 1 ? `=${args[arg]}` : ""),
            // );
        }

        if(!options){
            // options = {
            //     key: 'test',
            //     command: cmdArgs,
            //     stdErr: (stdErr: unknown) => console.log(stdErr),
            //     stdIn: (stdIn: unknown) => console.log(stdIn),
            //     stdOut: (stdOut: unknown) => console.log(stdOut)
            // } as ProcessRequest;
        }

        // if (options.key && ProcessService.process[options.key]) {
        //     return this.getProcess(options.key);
        // }

        if (ProcessService.debug) {
            console.log("Arguments passed to ProcessManager:", args);
        }


        if (ProcessService.debug) {
            console.log(
                "ProcessManager processed arguments to these:",
                cmdArgs,
            );
        }

        // return this.addProcess(options).run();
    }

    /**
     * Adds an external binary to the system so that it can be interacted with
     */
    // public addProcess(process: ProcessManagerRequest): ProcessManagerProcess {
    //     if (ProcessService.process && ProcessService.process[process.key]) {
    //         return ProcessService.process[process.key];
    //     }
    //     return ProcessService.process[process.key] = new ProcessManagerProcess(process);
    // }

    /**
     * Returns the src for the key, if we know about it

     */
    public getProcess(key: string) {
        if (!ProcessService.process[key]) {
            throw new Error(`Can't find process ${key}`);
        }
        return ProcessService.process[key];
    }

    /**
     * Start a src from its key, eg executable file name
     */
    public startProcess(key: string) {
        if (!ProcessService.process[key]) {
            throw new Error(`Can't find process ${key}`);
        }
        //@todo ad a feeder to centralised io handling, eg websocket srv
        ProcessService.process[key].run().catch(console.error);
    }

    /**
     * Stops a src managed by the ProcessManager
     */
    public stopProcess(key: string) {
        if (!ProcessService.process[key]) {
            throw new Error(`Can't find process ${key}`);
        }

        ProcessService.process[key].process.stop();
    }

}
