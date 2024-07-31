import { FirebaseInstance, RabbitMQInstance } from '../..';
import { UsernameAlreadyExistsError } from '../../config/errors/classes/ClientErrors';
import { UnknownError } from '../../config/errors/classes/SystemErrors';
import { IUser } from '../../config/interfaces/IUser';
import encryptString from '../../common/encryptString';
import UserService from '../UserService';

export interface IUpdateUserCredentialsPayload {
  email?: string;
  roninWallet?: string;
}

interface IRegisterUserReturnedResponse {
  userCredentials: IUser;
  userCreatedId: string;
}

interface IRegisterUserPayload {
  username: string;
  password: string;
}

class RegisterUserService {
  async registerUser(payload: IRegisterUserPayload): Promise<IRegisterUserReturnedResponse> {
    const rpcResponse = await RabbitMQInstance.sendRPCMessage<IRegisterUserPayload, IRegisterUserReturnedResponse>(
      'registerUserQueue',
      payload,
    );
    RabbitMQInstance.checkForErrorsAfterRPC(rpcResponse);

    const { fnReturnedData } = rpcResponse;
    if (!fnReturnedData) throw new UnknownError('Something went wrong');

    return fnReturnedData;
  }

  private async consumeRegisterUserQueue(msg: string) {
    const { username, password } = JSON.parse(msg) as { username: string; password: string };

    const customFilteredUsername = UserService.filterCustomUsername(username);

    const userExists = await UserService.checkIfUsernameExists(customFilteredUsername);
    if (userExists) throw new UsernameAlreadyExistsError();

    const nowTime = Date.now();
    const encryptedPassword = await encryptString(password);

    /* REVER QUESTÃO DO PASSWORD E RETORNO PARA O FRONT!!!!!! */
    const userInDbObj: IUser = {
      username: customFilteredUsername,
      password: encryptedPassword,
      avatar: '',
      balance: 0,
      email: {
        value: '',
        verified: false,
        lastEmail: '',
        updatedAt: nowTime,
        googleSub: null,
      },
      roninWallet: {
        value: '',
        lastWallet: '',
        verified: false,
        updatedAt: nowTime,
      },
      createdAt: nowTime,
    };

    const { docId } = await FirebaseInstance.writeDocument('users', userInDbObj);
    return { userCredentials: userInDbObj, userCreatedId: docId };
  }

  async startRegisterUserQueue() {
    await RabbitMQInstance.consumeMessages('registerUserQueue', async (msg) => {
      return await this.consumeRegisterUserQueue(msg);
    });
  }
}

export default new RegisterUserService();
