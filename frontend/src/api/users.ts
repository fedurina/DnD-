import { api } from "./client";
import type { User } from "@/types/auth";

export interface UserUpdatePayload {
  email?: string;
  username?: string;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}

export const usersApi = {
  updateMe: (payload: UserUpdatePayload) =>
    api.patch<User>("/users/me", payload, { auth: true }),
  changePassword: (payload: PasswordChangePayload) =>
    api.post<void>("/users/me/password", payload, { auth: true }),
};
