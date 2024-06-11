import ENVIRONMENT from '../config/constants/ENVIRONMENT';
import crypto from 'crypto';

export default function HMACVerifier(
  payload: any,
  receivedSignature: string,
  secret = ENVIRONMENT.SKY_MAVIS_WEBHOOK_SIGNATURE,
) {
  const payloadToJSON = typeof payload === 'object' ? JSON.stringify(payload) : payload;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(Buffer.from(payloadToJSON));

  const computedSignature = hmac.digest('hex');

  return receivedSignature === computedSignature;
}
