import { Injectable } from '@danet/core';
import {ProcessInfo} from "./interface.ts";

/**
 * Process Service
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
    private _stdout!: ReadableStream<Uint8Array>;
    private _stderr!: ReadableStream<Uint8Array>;
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

    /**
     * Create a Deno.Command object
     * @param command The full path to the binary
     * @param args The arguments to pass to the binary
     */
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

    /**
     * Run a command with arguments & wait for its return value
     * @param command The full path to the binary
     * @param args The arguments to pass to the binary
     */
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


    start(command: string, args: string[]){
        this._info.command = command;
        if(args.length > 0){
            this._info.args = args;
        }
        this._info.time_added = Date.now();
        this.command = new Deno.Command(command, {args: args})
        this._info.time_started = Date.now();
        const { stdout, stderr } = this.command.spawn()
        this._info.time_stopped = Date.now();
        this._stdout = stdout;
        this._stderr = stderr;
        return { stdout, stderr }
    }

    stop(){
        if(!this.handle){
            return false;
        }
        return this.handle.kill()
    }
    stdout(){
        return this._stdout;
    }
    stderr(){
        return this._stderr;
    }
}
