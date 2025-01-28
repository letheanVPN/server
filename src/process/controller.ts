
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

    /**
     * Run a src
     */
    @Post("run")
    async runProcess(@Body() body: ProcessRegister) {
        const { code, stdout, stderr } = await this.process.run(body.command);
        return { code, out: new TextDecoder().decode(stdout), error: new TextDecoder().decode(stderr) };
    }


    /**
     * Add a src to src registry
     */
    @Post("add")
    addProcess(@Body() body: ProcessRegister) {
        return this.process.add(body.key, body.command);
    }


    /**
     * Start a src in the src registry
     */
    @Post("start")
    startProcess(@Body() body: ProcessRequestStart) {
        return this.process.startProcess(body.key);
    }

    /**
     * Stop a src in the src registry
     */
    @Post("stop")
    stopProcess(@Body() body: ProcessRequestStop) {
        return this.process.stopProcess(body.key);
    }


    /**
     * Kill a src in the src registry
     * @param {ProcessKillDTO} body
     */
    @Post("kill")
    killProcess(@Body() body: ProcessRequestRemove) {
        return this.process.kill(body.key);
    }



}
