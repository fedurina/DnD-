import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/api/auth";
import type { LoginPayload, RegisterPayload } from "@/api/auth";
import { usersApi } from "@/api/users";
import type { PasswordChangePayload, UserUpdatePayload } from "@/api/users";
import type { User } from "@/types/auth";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  loadCurrentUser: () => Promise<void>;
  tryRefresh: () => Promise<boolean>;
  updateProfile: (payload: UserUpdatePayload) => Promise<User>;
  changePassword: (payload: PasswordChangePayload) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: "idle",

      login: async (payload) => {
        set({ status: "loading" });
        try {
          const tokens = await authApi.login(payload);
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          });
          const user = await authApi.me();
          set({ user, status: "authenticated" });
        } catch (e) {
          set({ status: "unauthenticated", accessToken: null, refreshToken: null, user: null });
          throw e;
        }
      },

      register: async (payload) => {
        await authApi.register(payload);
        await get().login({ email: payload.email, password: payload.password });
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          status: "unauthenticated",
        });
      },

      loadCurrentUser: async () => {
        const { accessToken, refreshToken } = get();
        if (!accessToken && !refreshToken) {
          set({ status: "unauthenticated" });
          return;
        }
        set({ status: "loading" });
        try {
          const user = await authApi.me();
          set({ user, status: "authenticated" });
        } catch {
          set({
            accessToken: null,
            refreshToken: null,
            user: null,
            status: "unauthenticated",
          });
        }
      },

      updateProfile: async (payload) => {
        const updated = await usersApi.updateMe(payload);
        set({ user: updated });
        return updated;
      },

      changePassword: async (payload) => {
        await usersApi.changePassword(payload);
      },

      tryRefresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const { access_token } = await authApi.refresh(refreshToken);
          set({ accessToken: access_token });
          return true;
        } catch {
          set({
            accessToken: null,
            refreshToken: null,
            user: null,
            status: "unauthenticated",
          });
          return false;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
);
