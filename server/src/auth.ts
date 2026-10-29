import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const COOKIE = "silhouette_session";
const MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

export interface AuthedRequest extends Request {
  userId?: number;
}

export function makeAuth(secret: string, secureCookies: boolean) {
  function issue(res: Response, userId: number) {
    const token = jwt.sign({ sub: String(userId) }, secret, { algorithm: "HS256", expiresIn: MAX_AGE_S });
    res.cookie(COOKIE, token, {
      httpOnly: true, // not readable from JavaScript, so XSS can't steal it
      sameSite: "lax", // not sent on cross-site POSTs
      secure: secureCookies,
      maxAge: MAX_AGE_S * 1000,
      path: "/",
    });
  }

  function clear(res: Response) {
    res.clearCookie(COOKIE, { path: "/" });
  }

  function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: "Sign in to continue." });
    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
      req.userId = Number(payload.sub);
      next();
    } catch {
      clear(res);
      res.status(401).json({ error: "Your session has expired. Sign in again." });
    }
  }

  return { issue, clear, requireUser };
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// A real bcrypt hash used to keep login timing the same whether or not the email exists.
export const DUMMY_HASH = bcrypt.hashSync("silhouette-timing-equaliser", 12);
