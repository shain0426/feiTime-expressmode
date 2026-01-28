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

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  code: string;
  password: string;
  passwordConfirmation: string;
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
  [key: string]: unknown;
}

export interface StrapiAuthResponse {
  jwt: string;
  user: StrapiUser;
}

export interface GoogleCallbackQuery {
  access_token?: string;
}

/**
 * 更新用戶資料的 payload 型別
 */
export interface UpdateUserPayload {
  blocked?: boolean;
  user_role?: "Member" | "Admin";
  username?: string;
  phone_number?: string;
  shipping_address?: string;
}

/**
 * 擴展 Express Request 型別以包含 user 屬性
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: StrapiUser;
    }
  }
}
