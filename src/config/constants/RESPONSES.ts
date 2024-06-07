const RESPONSE_CONFIG = {
  SUCCESS: {
    GET_MSG: 'Data received successfully',
    RAFFLE_CREATION_SUCCESS: 'Your raffle was created!',
    UPDATE_MSG: 'Data updated successfully',
    REDEEM_CODE_MSG: 'Code redeemed successfully',
    REGISTERED_IN: "You're now registered",
    LOGGED_IN: "You're now logged",
    TICKET_BUY_SUCCESS: "You're now in!",
  },

  ERROR: {
    TYPES: {
      Unknown: 'Unknown',
      Generic: 'Generic',
      Database: 'Database',
      Redis: 'Redis',
      Authorization: 'Authorization',
      Deposit: 'Deposit',
      Game: 'Game',
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
      GENERIC_MSG: `Something went wrong. We're fixing it!`,
      AUTH_MSG: 'Unauthorized',
      INVALID_USERNAME: 'Username or password invalid',
      INVALID_PASSWORD: 'Username or password invalid',
      JWT_EXPIRED: 'Session expired Please relog',
      CODE_NOT_FOUND: 'Invalid code',
      CODE_USAGE_LIMIT: 'Code reached limit',
      CODE_ALREADY_USED: 'Code already used',
      USERNAME_ALREADY_EXISTS: 'Username already exists',
      EMAIL_ALREADY_EXISTS: 'E-mail already exists',
      EMAIL_NOT_UPDATABLE: 'E-mail could not be updated',
      USER_NOT_FOUND: 'User not found',
      INSUFFICIENT_BALANCE: 'Insufficient balance',
      GAME_ALREADY_FINISHED: 'Game already finished',
      TICKET_ALREADY_TAKEN: 'Ticket already taken',
      QUANTITY_EXCEEDS_AVAILABLE_TICKETS: 'Quantity exceeds available tickets',
      WALLET_ALREADY_VERIFIED: 'Wallet already verified',
      WALLET_VERIFICATION: 'Wallet verification failed',
    },
  },
};

export { RESPONSE_CONFIG };
