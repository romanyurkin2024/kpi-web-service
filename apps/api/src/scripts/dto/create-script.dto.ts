import { IsString, IsOptional } from 'class-validator';

export class CreateScriptDto {
  @IsString()
  name_of_table: string;

  @IsString()
  name_of_product: string;

  @IsString()
  name_def: string;

  @IsString()
  script: string;

  @IsString()
  connector_use: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsString()
  editor: string;

  @IsOptional()
  @IsString()
  fragment?: string;
}
