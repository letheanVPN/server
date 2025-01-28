import { ApiProperty } from '@danet/swagger/decorators';


export class ReqFilePath {
    @ApiProperty()
    path!: string;
}

export class ReqCreateFile {
    @ApiProperty()
    path!: string;

    @ApiProperty()
    data!: string;
}

export class ResFilePath {
    @ApiProperty()
    path!: string;
    @ApiProperty()
    result!: boolean;
}

export class ResDirListDetailed {
    @ApiProperty()
    name!: string;
    @ApiProperty()
    isFile!: boolean;
    @ApiProperty()
    isDirectory!: boolean;
}
