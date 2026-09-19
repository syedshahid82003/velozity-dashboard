import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshTokenExpiry } from '../utils/jwt';
import { JwtAccessPayload } from '../types';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: input.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return user;
  },

  async login(input: LoginInput): Promise<{ user: JwtAccessPayload & { id: string }; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const tokens = await this._issueTokens(user.id, user.email, user.name, user.role);
    return {
      user: { userId: user.id, id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  },

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: rawRefreshToken },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw Object.assign(new Error('Refresh token expired or revoked'), { statusCode: 401 });
    }

    if (stored.userId !== payload.userId) {
      throw Object.assign(new Error('Token mismatch'), { statusCode: 401 });
    }

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const { user } = stored;
    return this._issueTokens(user.id, user.email, user.name, user.role);
  },

  async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { token: rawRefreshToken },
      data: { revoked: true },
    });
  },

  async _issueTokens(
    userId: string,
    email: string,
    name: string,
    role: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER'
  ): Promise<AuthTokens> {
    const tokenId = uuidv4();
    const accessToken = signAccessToken({ userId, email, name, role });
    const refreshToken = signRefreshToken({ userId, tokenId });

    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        token: refreshToken,
        userId,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return { accessToken, refreshToken };
  },
};
