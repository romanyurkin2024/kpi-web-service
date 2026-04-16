import { IsString, IsOptional } from 'class-validator';

export class AddToDirectoryDto {
  @IsOptional()
  @IsString()
  biznes?: string;

  @IsOptional()
  @IsString()
  gruppa?: string;

  @IsOptional()
  @IsString()
  prod?: string;

  @IsOptional()
  @IsString()
  prod_type?: string;

  @IsString()
  connector: string;

  @IsString()
  name_of_table: string;

  @IsString()
  name_of_def_q: string;

  @IsOptional()
  @IsString()
  name_of_product?: string;

  @IsOptional()
  @IsString()
  type_func?: string;

  @IsOptional()
  @IsString()
  base_ym?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsString()
  flow?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsString()
  delete_script?: string;
}
