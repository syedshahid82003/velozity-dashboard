import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { env } from '../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      sendSuccess(res, user, 'Account created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tokens } = await authService.login(req.body);

      // Refresh token → HttpOnly cookie (never localStorage)
      res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);

      sendSuccess(res, {
        accessToken: tokens.accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
      if (!rawToken) {
        sendError(res, 'No refresh token provided', 401);
        return;
      }

      const tokens = await authService.refresh(rawToken);

      res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
      sendSuccess(res, { accessToken: tokens.accessToken });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
      await authService.logout(rawToken);
      res.clearCookie(REFRESH_COOKIE_NAME);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  },

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }
      sendSuccess(res, req.user);
    } catch (err) {
      next(err);
    }
  },
};
