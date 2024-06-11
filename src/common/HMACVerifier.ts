import ENVIRONMENT from '../config/constants/ENVIRONMENT';
import crypto from 'crypto';

export default function HMACVerifier(
  payload: any,
  receivedSignature: string,
  secret = ENVIRONMENT.SKY_MAVIS_WEBHOOK_SIGNATURE,
) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(Buffer.from(payload));

  const computedSignature = hmac.digest('hex');

  return receivedSignature === computedSignature;
}
