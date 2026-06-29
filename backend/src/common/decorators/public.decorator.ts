import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Mark a route as public (skips JWT guard).
 * Use on login, register, and other open endpoints.
 *
 * @example
 * @Public()
 * @Post('login')
 * login() {}
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
