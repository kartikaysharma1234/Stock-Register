import { Request, Response } from "express";
import { authService, InviteUserInput } from "../services/auth.service";
import { sendSuccess } from "../utils/api-response";
import { actorFrom, validatedBody } from "./controller.utils";

export const authController = {
  async login(req: Request, res: Response) {
    const body = validatedBody<{ email: string; password: string }>(req);
    return sendSuccess(
      res,
      "Login successful",
      await authService.login(body.email, body.password, req.ip),
    );
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = validatedBody<{ refreshToken: string }>(req);
    return sendSuccess(
      res,
      "Token refreshed successfully",
      await authService.refresh(refreshToken, req.ip),
    );
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = validatedBody<{ refreshToken: string }>(req);
    await authService.logout(refreshToken, req.ip);
    return sendSuccess(res, "Logout successful", null);
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = validatedBody<{ email: string }>(req);
    await authService.forgotPassword(email);
    return sendSuccess(
      res,
      "If the account exists, a password reset email has been queued",
      null,
      202,
    );
  },

  async resetPassword(req: Request, res: Response) {
    const body = validatedBody<{ token: string; password: string }>(req);
    await authService.resetPassword(body.token, body.password);
    return sendSuccess(res, "Password reset successfully", null);
  },

  async verifyEmail(req: Request, res: Response) {
    const { token } = validatedBody<{ token: string }>(req);
    return sendSuccess(
      res,
      "Email verified successfully",
      await authService.verifyEmail(token),
    );
  },

  async invite(req: Request, res: Response) {
    const user = await authService.inviteUser(
      actorFrom(req),
      validatedBody<InviteUserInput>(req),
    );
    return sendSuccess(res, "Invitation sent successfully", user, 201);
  },

  async acceptInvite(req: Request, res: Response) {
    const body = validatedBody<{ token: string; password: string }>(req);
    return sendSuccess(
      res,
      "Invitation accepted successfully",
      await authService.acceptInvite(body.token, body.password),
    );
  },
};
