import { sign, SignOptions } from "jsonwebtoken";

export class JwtService {
  generateToken = (playload: any, secretKey: string, options: SignOptions) => {
    return sign(playload, secretKey, options);
  };
}