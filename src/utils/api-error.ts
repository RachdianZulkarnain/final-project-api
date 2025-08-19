export class ApiError extends Error {
  status: number;
  constructor(massage: string, status: number) {
    super(massage);
    this.status = status;
  }
}
