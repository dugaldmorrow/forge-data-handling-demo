
export interface ApiResponse<Data> {
  ok: boolean;
  statusCode: number;
  retryAfter?: number;
  getData: () => Promise<Data>;
}
