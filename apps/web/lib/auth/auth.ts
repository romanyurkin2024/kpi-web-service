import { api } from '../api';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  roles: string[];
}

export async function login(dto: LoginDto): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>('/auth/login', dto);
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function getMe(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/users/me');
  return data;
}

export function isAdmin(user: CurrentUser): boolean {
  return user.roles.includes('ADMIN');
}
