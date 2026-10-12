import userService from "../services/user.service.js";
import { createApiError } from "../utils/api-error.js";

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).send({ message: "User created successfully", user });
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    res.send(await userService.listUsers(req.validatedQuery));
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return next(createApiError(404, "User not found"));
    res.send({ user });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(
      req.params.id,
      req.body,
      req.user.id,
    );
    if (!user) return next(createApiError(404, "User not found"));
    res.send({ message: "User updated successfully", user });
  } catch (error) {
    next(error);
  }
};

const setUserStatus = async (req, res, next) => {
  try {
    const user = await userService.setUserStatus(
      req.params.id,
      req.body.userStatus,
      req.user.id,
    );
    if (!user) return next(createApiError(404, "User not found"));
    res.send({ message: "User status updated successfully", user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const deleted = await userService.deleteUser(req.params.id, req.user.id);
    if (!deleted) return next(createApiError(404, "User not found"));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export default {
  createUser,
  listUsers,
  getUser,
  updateUser,
  setUserStatus,
  deleteUser,
};
