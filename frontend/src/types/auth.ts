export type UserRole = "player" | "master";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AccessToken {
  access_token: string;
  token_type: string;
}
