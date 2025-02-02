
import {
    ProcessRegister,
    ProcessRequestRemove,
    ProcessRequestStart,
    ProcessRequestStop
} from "./interface.ts";
import { Tag } from '@danet/swagger/decorators';
import { Body, Controller, Post } from '@danet/core';
import {ProcessService} from "./service.ts";

@Tag( "Process" )
@Controller("process" )
export class ProcessController  {
    constructor(private process: ProcessService) {}

    // @Post("run")
    // async runProcess(@Body() body: ProcessRegister) {
    //     const { code, stdout, stderr } = await this.process.run(body.command);
    //     return { code, out: new TextDecoder().decode(stdout), error: new TextDecoder().decode(stderr) };
    // }

    // for (const arg in args) {
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

    // @Post("add")
    // addProcess(@Body() body: ProcessRegister) {
    //     return this.process.add(body.key, [body.command]);
    // }

    // @Post("start")
    // startProcess(@Body() body: ProcessRequestStart) {
    //     return this.process.startProcess(body.key);
    // }

    // @Post("stop")
    // stopProcess(@Body() body: ProcessRequestStop) {
    //     return this.process.stopProcess(body.key);
    // }


    // @Post("kill")
    // killProcess(@Body() body: ProcessRequestRemove) {
    //     return this.process.kill(body.key);
    // }



}
