import customerService from "../services/customer.service.js";
import { createApiError } from "../utils/api-error.js";

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body, req.user);
    res.status(201).send({ message: "Customer created successfully", customer });
  } catch (error) {
    next(error);
  }
};

const listCustomers = async (req, res, next) => {
  try {
    res.send(await customerService.listCustomers(req.validatedQuery, req.user));
  } catch (error) {
    next(error);
  }
};

const getCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(
      req.params.id,
      req.user,
    );
    if (!customer) return next(createApiError(404, "Customer not found"));
    res.send({ customer });
  } catch (error) {
    next(error);
  }
};

const getCustomerTimeline = async (req, res, next) => {
  try {
    const timeline = await customerService.getCustomerTimelineById(
      req.params.id,
      req.user,
    );
    if (!timeline) {
      return next(createApiError(404, "Customer not found"));
    }
    res.send({ timeline });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(
      req.params.id,
      req.body,
      req.user,
    );
    if (!customer) return next(createApiError(404, "Customer not found"));
    res.send({ message: "Customer updated successfully", customer });
  } catch (error) {
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const deleted = await customerService.deleteCustomer(
      req.params.id,
      req.user,
    );
    if (!deleted) return next(createApiError(404, "Customer not found"));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export default {
  createCustomer,
  listCustomers,
  getCustomer,
  getCustomerTimeline,
  updateCustomer,
  deleteCustomer,
};
