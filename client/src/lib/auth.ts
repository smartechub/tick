import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'employee' | 'manager';
  department: string;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const response = await apiRequest('POST', '/api/auth/login', { username, password });
  const data = await response.json();
  return data.user;
}

export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiRequest('GET', '/api/auth/me');
    const data = await response.json();
    return data.user;
  } catch (error) {
    return null;
  }
}
