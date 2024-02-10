import { IUserToFrontEnd } from './IUser';

export default interface IAPIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface IAuthResponse {
  userCredentials?: IUserToFrontEnd;
  token?: string;
}
