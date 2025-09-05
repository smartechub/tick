import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: string;
  employeeId: string;
  username: string;
  name: string;
  email: string;
  mobile: string;
  department: string;
  designation: string;
  role: 'admin' | 'viewer' | 'user';
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
