import axios from "axios";

/**
 * All requests go through /api/proxy/* (Next.js route handler).
 * The proxy reads the httpOnly `wn_sid` cookie server-side and adds
 * `Authorization: Bearer <token>` before forwarding to Laravel.
 * JS never touches the token.
 */
export const apiClient = axios.create({
  baseURL: "/api/proxy",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: true, // send cookies on same-origin requests
});
