import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import {
  actorFrom,
  validatedBody,
} from "./controller.utils";

export const authController = {
  async login(req: Request, res: Response) {
    const body = validatedBody<{ email: string; password: string }>(req);
    res.json(await authService.login(body.email, body.password, req.ip));
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = validatedBody<{ refreshToken: string }>(req);
    res.json(await authService.refresh(refreshToken, req.ip));
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = validatedBody<{ refreshToken: string }>(req);
    await authService.logout(refreshToken, req.ip);
    res.status(204).send();
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = validatedBody<{ email: string }>(req);
    await authService.forgotPassword(email);
    res.status(202).json({
      message: "If the account exists, a password reset email has been queued",
    });
  },

  async resetPassword(req: Request, res: Response) {
    const body = validatedBody<{ token: string; password: string }>(req);
    await authService.resetPassword(body.token, body.password);
    res.status(204).send();
  },

  async invite(req: Request, res: Response) {
    const user = await authService.inviteUser(actorFrom(req), validatedBody(req));
    res.status(201).json(user);
  },

  async acceptInvite(req: Request, res: Response) {
    const body = validatedBody<{ token: string; password: string }>(req);
    res.json(await authService.acceptInvite(body.token, body.password));
  },
};
