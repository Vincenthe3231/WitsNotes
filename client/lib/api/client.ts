import axios from "axios";
import { ApiErrorSchema } from "./schemas";
import { ApiError } from "./errors";

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

// Response interceptor — normalize errors → ApiError
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status || 0;
    const data = err.response?.data;

    // Try to parse as ApiErrorSchema
    if (data) {
      const parsed = ApiErrorSchema.safeParse(data);
      if (parsed.success) {
        const { error } = parsed.data;
        const apiErr = new ApiError(error.code, error.message, status, error.details);

        // Dispatch to toast for non-422 errors (form errors handled inline)
        if (status !== 422) {
          try {
            const { useToastStore } = await import("@/stores/toastStore");
            const store = useToastStore.getState();
            const toastLevel =
              status >= 500
                ? "error"
                : status === 401 || status === 403
                  ? "error"
                  : status === 404
                    ? "error"
                    : "error";
            store.push({
              level: toastLevel,
              message: error.message,
              ttl: 5000,
            });
          } catch {
            // Toast store not available yet
          }
        }

        return Promise.reject(apiErr);
      }
    }

    // Parse failure — synthesize error
    let code = "server_error";
    let message = "Server error";
    if (!err.response) {
      code = "network_error";
      message = "Network error";
    } else if (status === 0) {
      code = "network_error";
      message = "Network error";
    }

    const apiErr = new ApiError(code, message, status);

    // Dispatch toast for network/synthesized errors
    if (status !== 422) {
      try {
        const { useToastStore } = await import("@/stores/toastStore");
        const store = useToastStore.getState();
        store.push({
          level: "error",
          message: message,
          ttl: 5000,
        });
      } catch {
        // Toast store not available yet
      }
    }

    return Promise.reject(apiErr);
  }
);
