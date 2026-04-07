import { IsString, IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsIn(['ADMIN', 'USER'])
  role!: string;
}
