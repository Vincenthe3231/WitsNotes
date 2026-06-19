import { apiClient } from "./client";
import { User, UserSchema } from "./schemas";

export async function login(input: { email: string; password: string }): Promise<User> {
  const res = await apiClient.post("/login", input);
  // Proxy strips token, returns { user }
  return UserSchema.parse(res.data.user);
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<User> {
  const res = await apiClient.post("/register", input);
  return UserSchema.parse(res.data.user);
}

export async function logout(): Promise<void> {
  await apiClient.post("/logout");
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get("/me");
  return UserSchema.parse(res.data);
}
