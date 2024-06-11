import ENVIRONMENT from '../config/constants/ENVIRONMENT';
import crypto from 'crypto';

export default function HMACVerifier(
  payload: any,
  receivedSignature: string,
  secret = ENVIRONMENT.SKY_MAVIS_WEBHOOK_SIGNATURE,
) {
  const computedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(computedSignature, 'hex'), Buffer.from(receivedSignature, 'hex'));
}
