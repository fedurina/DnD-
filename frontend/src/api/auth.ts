import { api } from "./client";
import type { AccessToken, TokenPair, User, UserRole } from "@/types/auth";

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) => api.post<User>("/auth/register", payload),
  login: (payload: LoginPayload) => api.post<TokenPair>("/auth/login", payload),
  refresh: (refreshToken: string) =>
    api.post<AccessToken>("/auth/refresh", { refresh_token: refreshToken }),
  me: () => api.get<User>("/auth/me", { auth: true }),
};
