import { join } from "@std/path/join";
import { dirname } from "@std/path/dirname";
import { ensureDirSync  } from "@std/fs/ensure-dir";
import { Injectable } from '@danet/core';
import _DirEntry = Deno.DirEntry;

/**
 * @class
 * @classdesc This class is responsible for handling the storage.
 */
@Injectable()
export class FsLocalService {
    /**
     * Return a system path to the Lethean folder
     */
    path(pathname: string|string[]): string {
        if (pathname == undefined) {
            return Deno.cwd();
        }

        if (typeof pathname === "string") {
            pathname = pathname.replace(/\.\./g, ".");
            if (pathname.match("/")) {
                pathname = pathname.split("/");
            } else if (pathname.match("\\\\")) {
                pathname = pathname.split("\\\\");
            } else {
                pathname = [pathname];
            }
        }
        return join(Deno.cwd(), ...pathname);
    }

    /**
     * Read a storage from the Lethean folder
     */
    read(path: string): string | false {
        try {
            return Deno.readTextFileSync(this.path(path)) as string;
        } catch (_e) {
            return false;
        }
    }

    /**
     * Checks if a directory exists
     */
    isDir(path: string): boolean {
        if (path.length == 0) return false;

        try {
            return Deno.statSync(this.path(path)).isDirectory;
        } catch (_e) {
            return false;
        }
    }

    /**
     * Checks if a storage exists
     */
    isFile(path: string): boolean {
        if (path.length == 0) return false;

        try {
            return Deno.statSync(this.path(path)).isFile;
        } catch (_e) {
            return false;
        }
    }

    /**
     *  List all files in a directory  (recursive)
     */
    list(path: string): string[] {
        const ret = [];
        try {
            for (
                const dirEntry of Deno.readDirSync(
                this.path(path),
            )
                ) {
                if (!dirEntry.name.startsWith(".")) {
                    ret.push(dirEntry.name);
                }
            }
            return ret;
        } catch (_e) {
            return [];
        }
    }

    detailedList(path: string): _DirEntry[] {
        const ret = [];
        try {
            for (
                const dirEntry of Deno.readDirSync(
                this.path(path),
            )
                ) {
                ret.push(dirEntry);
            }
            return ret;
        } catch (_e) {
            return [];
        }
    }

    /**
     * Write to the Lethean data folder
     */
    write(filepath: string, data: string) {
        try {
            this.ensureDir(dirname(filepath));

            Deno.writeTextFileSync(filepath, data);
        } catch (_e) {
            return false;
        }

        return true;
    }

    /**
     * Makes sure the directory structure is in place for path
     */
    ensureDir(path: string) {
        try {
            ensureDirSync(this.path(path));
        } catch (_e) {
            return false;
        }
        return true;
    }

    /**
     * Delete a storage
     */
    delete(filepath: string, recursive = true) {
        try {
            const delPath = this.path(filepath);
            // @todo consider changing this, quick add to stop rm /
            if(delPath.length < 3){
                return false;
            }

            Deno.removeSync(delPath, { recursive });
        } catch (_e) {
            return false;
        }
        return true;
    }

    extension(name: string): string {
        if (Deno.build.os === "windows") {
            return name+".exe";
        }
        return name;
    }
}
