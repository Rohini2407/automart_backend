import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";

export interface JwtPayload {
  email: string;
  type: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    const authHeader: string = req.headers["authorization"] || "";
    const token = authHeader.replace("Bearer ", "").trim();

    // Optionally validate against Redis cache
    const isValid = await this.authService.validateCachedToken(
      payload.email,
      payload.type,
      token
    );

    if (!isValid) {
      throw new UnauthorizedException("Token has been invalidated");
    }

    return payload;
  }
}
