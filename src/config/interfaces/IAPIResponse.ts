export default interface IAPIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
