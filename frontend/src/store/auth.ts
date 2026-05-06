import { create } from "zustand";
import { authApi } from "@/api/auth";
import type { LoginPayload, RegisterPayload } from "@/api/auth";
import { usersApi } from "@/api/users";
import type { PasswordChangePayload, UserUpdatePayload } from "@/api/users";
import type { User } from "@/types/auth";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  tryRefresh: () => Promise<boolean>;
  updateProfile: (payload: UserUpdatePayload) => Promise<User>;
  changePassword: (payload: PasswordChangePayload) => Promise<void>;
}

// Access token lives in memory only — refresh token is in an httpOnly cookie
// and is not accessible to JS, defending against XSS exfiltration.
export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  status: "idle",

  login: async (payload) => {
    set({ status: "loading" });
    try {
      const { access_token } = await authApi.login(payload);
      set({ accessToken: access_token });
      const user = await authApi.me();
      set({ user, status: "authenticated" });
    } catch (e) {
      set({ status: "unauthenticated", accessToken: null, user: null });
      throw e;
    }
  },

  register: async (payload) => {
    await authApi.register(payload);
    await get().login({ email: payload.email, password: payload.password });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear local state regardless
    }
    set({ accessToken: null, user: null, status: "unauthenticated" });
  },

  bootstrap: async () => {
    // Called on app mount: attempt silent refresh via the cookie.
    set({ status: "loading" });
    const ok = await get().tryRefresh();
    if (!ok) {
      set({ status: "unauthenticated", user: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, status: "authenticated" });
    } catch {
      set({ accessToken: null, user: null, status: "unauthenticated" });
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
    try {
      const { access_token } = await authApi.refresh();
      set({ accessToken: access_token });
      return true;
    } catch {
      set({ accessToken: null });
      return false;
    }
  },
}));
