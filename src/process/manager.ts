import { EventEmitter } from '@danet/core';
import { ProcessRequest } from "./interface.ts";
import {ProcessService} from "./service.ts";
const eventEmitter = new EventEmitter()

export class ProcessManager  {
    //private request;

    /**
     * Keeps record of processes managed by the class
     */
    private static process: { [name: string]: ProcessService } = {};

    public process: any;

    constructor() {

        //this.request = request;
    }

    public async run() {
        // const processArgs: any = {
        //     cmd: this.request.command,
        // };
        //
        // // check if we have a stdIn
        // if (this.request.stdIn) {
        //     processArgs["stdin"] = "piped";
        // }
        // // check if we have a stdOut
        // if (this.request.stdOut) {
        //     processArgs["stdout"] = "piped";
        // }
        // // check if we have a stdIn
        // if (this.request.stdErr) {
        //     processArgs["stderr"] = "piped";
        // }
        // console.log(processArgs);
        //
        // try {
        //     const process = new Deno.Command(processArgs);
        //
        //     // const sock = new Sub();
        //     const that = this;
        //     // sock.connect("ws://127.0.0.1:36910/pub");
        //     // await sock.subscribe(`${this.request.key}-stdIn`);
        //     // console.log(`Subscribed to ${this.request.key}-stdIn/pub`);
        //     // sock.on("message", function (endpoint, topic, message) {
        //     //   if (topic.toString() === `${that.request.key}-stdIn`) {
        //     //     //console.log(that.src);
        //     //     if (process.stdin) {
        //     //       that.request.stdOut(message.toString());
        //     //       process.stdin.write(message);
        //     //     }
        //     //   }
        //     // });
        //     if (this.request.stdOut) {
        //         //@ts-ignore
        //         for await (const line of readLines(process.stdout)) {
        //             if (line.trim()) {
        //                 console.log(line.toString());
        //                 eventEmitter.emit("stdout", line);
        //                 // that.request.stdOut();
        //                 //  ZeroMQServerService.sendPubMessage(that.request.key, line);
        //                 // super.emit("stdout", line);
        //             }
        //         }
        //     }
        //
        //     if (this.request.stdErr) {
        //         //@ts-ignore j
        //         for await (const line of readLines(process.stderr)) {
        //             if (line.trim()) {
        //                 console.error(line.toString());
        //                 eventEmitter.emit("stderr", line);
        //                 // that.request.stdErr(line.toString());
        //                 //  ZeroMQServerService.sendPubMessage(that.request.key, line);
        //                 //super.emit("stderr", line);
        //             }
        //         }
        //     }
        //
        //     //  super.emit("end", 0);
        //     return process;
        // } catch (_e) {

            //e.preventDefault();
       // }
    }

    public add(key: string, process: ProcessService) {
        if (ProcessManager.process && ProcessManager.process[key]) {
            return ProcessManager.process[key];
        }
        return ProcessManager.process[key] = process;
    }
    list(){
        return Object.keys(ProcessManager.process)
    }

    public get(key: string) {
        if (!ProcessManager.process[key]) {
            throw new Error(`Can't find process ${key}`);
        }
        return ProcessManager.process[key];
    }

    /**
     * Start a src from its key, eg executable file name
     */
    public start(key: string) {
        if (!ProcessManager.process[key]) {
            throw new Error(`Can't find process ${key}`);
        }
        //@todo ad a feeder to centralised io handling, eg websocket srv
        ProcessManager.process[key].run(key);
    }

    /**
     * Stops a src managed by the ProcessManager
     */
    public stop(key: string) {
        if (!ProcessManager.process[key]) {
            throw new Error(`Can't find process ${key}`);
        }

        ProcessManager.process[key].stop();
    }

    public remove(key: string) {
        if (!ProcessManager.process[key]) {
            throw new Error(`Can't find process ${key}`);
        }
        delete ProcessManager.process[key];
    }
}
