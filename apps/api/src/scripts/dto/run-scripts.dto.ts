import { IsString, IsObject, IsOptional } from 'class-validator';

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

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsString()
  deleteScript?: string;
}
