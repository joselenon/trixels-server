const RESPONSE_CONFIG = {
  SUCCESS: {
    GET_MSG: 'Data received successfully',
    UPDATE_MSG: 'Data updated successfully',
    REDEEM_CODE_MSG: 'Code redeemed successfully',
    LOGGED_IN: "You're now logged",
  },

  ERROR: {
    TYPES: {
      Unknown: 'Unknown',
      Generic: 'Generic',
      Database: 'Database',
      Redis: 'Redis',
      Authorization: 'Authorization',
      Deposit: 'Deposit',
      ExternalAPIs: 'External APIs',
      Register: 'Register',
      UserInfo: 'User Info',
      EnvVariablesMissing: 'Environment Variables Missing',
    },

    SYSTEM_ERROR_MSGS: {
      DOCUMENT_NOT_IN_DB_MSG: 'Document not in DB',
      INVALID_PAYLOAD: 'Invalid payload',
      REDIS: 'Error at redis',
      ENV_VARIABLES_MISSING: 'You forgot some environment variables: ',
      UNAVAILABLE_AUTH_METHOD: 'Unavailable auth method',
    },

    CLIENT_ERROR_MSGS: {
      GENERIC_MSG: 'Houve um erro... já estamos trabalhando para corrigí-lo!',
      AUTH_MSG: 'Não autorizado',
      JWT_EXPIRED: 'Session expired. Please relog.',
      CODE_NOT_FOUND: 'Código inválido',
      CODE_USAGE_LIMIT: 'Limite de uso para o código atingido',
      CODE_ALREADY_USED: 'Código já utilizado',
      EMAIL_ALREADY_EXISTS: 'E-mail já existe',
      EMAIL_NOT_UPDATABLE: 'E-mail não pode ser atualizado',
      USER_NOT_FOUND: 'User not found',
    },
  },
};

export { RESPONSE_CONFIG };
