import { Injectable } from '@danet/core';
import {ProcessInfo, ProcessRequest} from "./interface.ts";


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
    private debug = 0;
    private command: Deno.Command | undefined;
    private args!: string[];
    private handle!: Deno.ChildProcess;
    private _info: ProcessInfo  = {
        command: '',
        args: [],
        time_added: 0,
        time_started: 0,
        time_stopped: 0,
    }

    info(): ProcessInfo{
        return this._info;
    }

    add(command: string, args: string[] = []){
        if(command.length === 0){
            return false;
        }
        this._info.command = command;
        if(args.length > 0){
            this._info.args = args;
            return this.command = new Deno.Command(command, {args: this.args})
        }
        return this.command = new Deno.Command(command, {args: this.args})
    }

    async run(command: string, args: string[] = []){
        this._info.command = command;
        if(args.length > 0){
            this._info.args = args;
        }
        this._info.time_added = Date.now();
        this.command = new Deno.Command(command, {args: args})
        this._info.time_started = Date.now();
        const { code, stdout, stderr } = await this.command.output()
        this._info.time_stopped = Date.now();
        return { code, stdout, stderr }
    }

    start(command: string, args?: string[]){
        //return this.handle = this.command.spawn()
    }

    stop(){
        //this.has(command, args)
        return this.handle.kill()
    }




    /**
     * Creates a src record and then starts it...
     * to be expanded as you can do ProcessManager.startProcess('letheand.exe')
     * so starting right away is optional
     */
    // startmm(command: string, args: any, options?: ProcessRequest) {
    //     // if (!args) {
    //     //     console.log("No arguments passed to ProcessManager");
    //     //     return;
    //     // }
    //     //
    //     // const cmdArgs = [command];
    //     //
    //     // for (const arg in args) {
    //     //     if (arg === "igd") {
    //     //         continue;
    //     //     }
    //     //     cmdArgs.push(args[arg]);
    //     //     // cmdArgs.push(
    //     //     //     "--" + arg.replace(/([A-Z])/g, (x) => "-" + x.toLowerCase()) +
    //     //     //     (args[arg].length > 1 ? `=${args[arg]}` : ""),
    //     //     // );
    //     // }
    //
    //     // if(!options){
    //     //     // options = {
    //     //     //     key: 'test',
    //     //     //     command: cmdArgs,
    //     //     //     stdErr: (stdErr: unknown) => console.log(stdErr),
    //     //     //     stdIn: (stdIn: unknown) => console.log(stdIn),
    //     //     //     stdOut: (stdOut: unknown) => console.log(stdOut)
    //     //     // } as ProcessRequest;
    //     // }
    //
    //     // if (options.key && ProcessService.process[options.key]) {
    //     //     return this.getProcess(options.key);
    //     // }
    //
    //     // if (ProcessService.debug) {
    //     //     console.log("Arguments passed to ProcessManager:", args);
    //     // }
    //     //
    //     //
    //     // if (ProcessService.debug) {
    //     //     console.log(
    //     //         "ProcessManager processed arguments to these:",
    //     //         cmdArgs,
    //     //     );
    //     // }
    //
    //     // return this.addProcess(options).run();
    // }



}
