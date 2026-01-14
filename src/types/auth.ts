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
