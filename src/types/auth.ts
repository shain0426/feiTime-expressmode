export interface User {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  user_role: "Member" | "Admin";

  role?: {
    type: string;
  };
}

export interface AuthResponse {
  jwt: string;
  user: User;
}
export interface StrapiUser {
  id: number;
  documentId: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  user_role?: "Member" | "Admin";
  role?: {
    id: number;
    name: string;
    type: string;
  };
}

export interface StrapiAuthResponse {
  jwt: string;
  user: StrapiUser;
}

export interface GoogleCallbackQuery {
  access_token?: string;
}
