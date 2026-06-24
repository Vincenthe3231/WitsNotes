import { apiClient } from "./client";
import { User, UserSchema, LoginSchema, LoginInput, RegisterSchema, RegisterInput } from "./schemas";

export async function login(input: LoginInput): Promise<User> {
  const validated = LoginSchema.parse(input);
  const res = await apiClient.post("/login", validated);
  // Proxy strips token, returns { user }
  return UserSchema.parse(res.data.user);
}

export async function register(input: RegisterInput): Promise<User> {
  const validated = RegisterSchema.parse(input);
  const res = await apiClient.post("/register", validated);
  return UserSchema.parse(res.data.user);
}

export async function logout(): Promise<void> {
  await apiClient.post("/logout");
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get("/me");
  return UserSchema.parse(res.data);
}
