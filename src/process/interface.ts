import { ApiProperty } from '@danet/swagger/decorators';

export interface ProcessRequest {
  key: string;
  command: string | undefined;
  stdOut: object | undefined;
  stdIn: object | undefined;
  stdErr: object | undefined;
}

export class ProcessRequestRemove {
  @ApiProperty()
  key!: string;
}

export class ProcessRequestStop {
  @ApiProperty()
  key!: string;
}

export class ProcessRequestStart {
  @ApiProperty()
  key!: string;
}

export class ProcessRegister implements ProcessRequest {
  @ApiProperty()
  key!: string;
  @ApiProperty()
  command!: string;
  @ApiProperty()
  // deno-lint-ignore no-explicit-any
  stdOut: any;
  @ApiProperty()
  // deno-lint-ignore no-explicit-any
  stdIn: any;
  @ApiProperty()
  // deno-lint-ignore no-explicit-any
  stdErr: any;
}

export class ProcessRequestRun {
  @ApiProperty()
  command!: string;
  @ApiProperty()
  args!: { [name: string]: string | number | boolean };
}
