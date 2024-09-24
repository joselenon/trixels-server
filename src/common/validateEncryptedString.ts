import bcrypt from 'bcrypt';
import { UnknownError } from '../config/errors/classes/SystemErrors';

async function validateEncryptedString(string: string, storedHashedString: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Comparar a senha fornecida com o hash armazenado
    bcrypt.compare(string, storedHashedString, (error, result) => {
      if (error) {
        reject(new UnknownError(`Erro ao comparar senhas: ${error}`));
      } else {
        // Resolve a Promise com um booleano indicando se as senhas coincidem
        resolve(result);
      }
    });
  });
}

export default validateEncryptedString;
