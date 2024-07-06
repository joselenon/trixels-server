import ENVIRONMENT from '../config/constants/ENVIRONMENT';
import crypto from 'crypto';
import { ForgedWebhookError } from '../config/errors/classes/SystemErrors';

export default function HMACVerifier(
  payload: any,
  skyMavisSignature: string,
  signingKey = ENVIRONMENT.SKY_MAVIS_WEBHOOK_SIGNATURE,
) {
  const payloadToJSON = JSON.stringify(payload);

  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(Buffer.isBuffer(payloadToJSON) ? payloadToJSON : Buffer.from(payloadToJSON));

  const computedSignature = hmac.digest('hex');

  if (skyMavisSignature !== computedSignature) throw new ForgedWebhookError();
}
