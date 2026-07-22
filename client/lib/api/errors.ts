export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number,
    public details: unknown = null,
    public correlationId?: string,
    public latencyMs?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}
