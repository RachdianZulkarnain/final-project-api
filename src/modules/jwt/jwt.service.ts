import { sign, SignOptions } from "jsonwebtoken";

export class JwtService {
  generateToken = (payload: any, secreyKey: string, options: SignOptions) => {
    return sign(payload, secreyKey, options);
  };
}
