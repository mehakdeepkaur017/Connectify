export class ApiResponse<T> {
  public success: boolean;
  public message: string;
  public data: T | null;
  public errors?: any;

  constructor(success: boolean, message: string, data: T | null = null, errors?: any) {
    this.success = success;
    this.message = message;
    this.data = data;
    if (errors) {
      this.errors = errors;
    }
  }
}
