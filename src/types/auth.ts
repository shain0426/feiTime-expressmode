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
