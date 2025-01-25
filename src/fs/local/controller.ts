import { Body, Controller, Post } from '@danet/core';
import {FsLocalService} from "./service.ts";
import { ReturnedType, Tag } from '@danet/swagger/decorators';
import {ReqFilePath} from "./interfaces.ts";


@Tag( "Input/Output" )
@Controller("fs/local" )
export class FsLocalController {

    constructor(private fileSystemService: FsLocalService) {}

    /**
     * Lists directory contents
     */
    @Post("list")
    @ReturnedType(Array)
    getDirectoryList(@Body() body: ReqFilePath): string[] {
        return this.fileSystemService.list(body.path);
    }

    /**
     * Lists directory contents with detailed information
     */
    @Post("list-detailed")
    @ReturnedType(Array)
    getDetailedDirectoryList(@Body() body: ReqFilePath): Deno.DirEntry[] {
        return this.fileSystemService.detailedList(body.path);
    }

    /**
     * Reads storage contents
     * @param {ReqFilePath} body
     * @returns {string | boolean}
     */
    @Post("read")
    readFile(@Body() body: ReqFilePath): string | boolean {

        const result = this.fileSystemService.read(body.path);
        if(result === false) return false;
        return btoa(result);
    }

    /**
     * Writes storage contents
     * @param {CreateFileDTO} body
     * @returns {boolean}
     */
    @Post("write")
    writeFile(@Body() body: {path:string,data:string}): boolean {
        const data = atob(body.data);
        return this.fileSystemService.write(body.path, data);
    }

    /**
     * Checks if path is a storage

     * @returns {boolean}
     */
    @Post("is-file")
    isFile(@Body() body: {path:string}): {path: string, result: boolean} {
        return {
            path: body.path,
            result: this.fileSystemService.isFile(body.path)
        };
    }

    /**
     * Checks if path is a directory
     * @param {path:string} body
     * @returns {boolean}
     */
    @Post("is-dir")
    isDir(@Body() body: {path:string}): {path: string, result: boolean} {
        return {
            path: body.path,
            result: this.fileSystemService.isDir(body.path)
        };
    }

}
