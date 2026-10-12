import authService from "../services/auth.service.js";
import { createApiError } from "../utils/api-error.js";

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).send({ message: "Registration successful", user });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    res.send(await authService.login(req.body));
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    res.send(await authService.refresh(req.body.refreshToken));
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    if (!user) return next(createApiError(404, "User not found"));
    res.send({ user });
  } catch (error) {
    next(error);
  }
};

export default { register, login, refresh, logout, me };
