
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
