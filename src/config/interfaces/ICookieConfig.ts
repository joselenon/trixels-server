export default interface ICookieConfig {
  key: string;
  config: { maxAge?: number; httpOnly?: boolean };
}
