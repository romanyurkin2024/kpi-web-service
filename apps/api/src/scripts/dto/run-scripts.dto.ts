import { IsString, IsObject } from 'class-validator';

export class RunScriptDto {
  @IsString()
  script: string;

  @IsString()
  targetTable: string;

  @IsString()
  connector: string;

  @IsString()
  nameOfFunc: string;

  @IsObject()
  params: Record<string, string>;
}
