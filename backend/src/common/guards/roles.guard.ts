import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DataSource } from "typeorm";
import { ROLES_KEY, UserRole } from "../decorators/roles.decorator";

/**
 * Must run AFTER a JWT guard (so req.user is populated).
 * Looks the role up in the DB instead of trusting the token, so a
 * deactivated / pending account loses access immediately.
 * The precise failure reason is logged server-side; the client only sees a generic 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest();
    const email: string | undefined = req.user?.email;

    if (!email) {
      this.logger.warn(
        `DENIED: no email on req.user (req.user = ${JSON.stringify(req.user)}). ` +
          `JWT guard not run, or your JwtStrategy.validate() returns a different shape.`,
      );
      throw new ForbiddenException("Access denied");
    }

    const rows: Array<{ role: UserRole; status: string }> =
      await this.dataSource.query(
        "SELECT role, status FROM users WHERE email = ? LIMIT 1",
        [email],
      );
    const user = rows[0];

    if (!user) {
      this.logger.warn(`DENIED: no row in \`users\` for email "${email}".`);
      throw new ForbiddenException("Access denied");
    }
    if (user.status !== "active") {
      this.logger.warn(
        `DENIED: "${email}" has status "${user.status}" (needs "active").`,
      );
      throw new ForbiddenException("Access denied");
    }
    if (!required.includes(user.role)) {
      this.logger.warn(
        `DENIED: "${email}" has role "${user.role}", needs one of [${required}].`,
      );
      throw new ForbiddenException("Access denied");
    }
    req.userRole = user.role; // verified role, available to handlers via @Req()
    return true;
  }
}
