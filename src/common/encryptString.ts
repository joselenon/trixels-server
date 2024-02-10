import bcrypt from 'bcrypt';
import { UnknownError } from '../config/errors/classes/SystemErrors';

async function encryptString(textToEncrypt: string): Promise<string> {
  const saltRounds = 10; // Número de rounds para o processo de hashing

  return new Promise((resolve, reject) => {
    // Gere um salt para adicionar à senha
    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) {
        reject(new UnknownError(`BCRYPT: ERROR GENERATING SALT: ${err}`));
      } else {
        // Usando salt para criação do hash
        bcrypt.hash(textToEncrypt, salt, (err, hash) => {
          if (err) {
            reject(new UnknownError(`BCRYPT ERROR: ${err}`));
          } else {
            // Resolve a Promise com o hash do texto
            resolve(hash);
          }
        });
      }
    });
  });
}

export default encryptString;
