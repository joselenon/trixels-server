import { RESPONSE_CONFIG } from '../config/constants/RESPONSES';

type TSuccessMessage = keyof typeof RESPONSE_CONFIG.SUCCESS;
type TErrorMessage = keyof typeof RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS;
export type TMessages = TSuccessMessage | TErrorMessage;

const MESSAGES = {
  ...RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS,
  ...RESPONSE_CONFIG.SUCCESS,
};

export const responseBody = <T>(
  success: boolean,
  message: TMessages,
  data: T | null,
) => ({
  success: success,
  message: MESSAGES[message],
  data,
});

// Used at HTTP errors treatment middleware
export const errorResponse = (message: string) => ({
  success: false,
  message: message,
});
