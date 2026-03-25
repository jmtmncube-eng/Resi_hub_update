export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  message?: string;
}

export interface ApiError {
  success: false;
  error:   string;
  code?:   string;
  issues?: { field: string; message: string }[];
}
