import leadService from "../services/lead.service.js";
import { createApiError } from "../utils/api-error.js";
import {
  abortTransaction,
  commitTransaction,
  startTransaction,
} from "../utils/transaction.js";

const createLead = async (req, res, next) => {
  try {
    const lead = await leadService.createLead(req.body, req.user);
    res.status(201).send({ message: "Lead created successfully", lead });
  } catch (error) {
    next(error);
  }
};

const listLeads = async (req, res, next) => {
  try {
    res.send(await leadService.listLeads(req.validatedQuery, req.user));
  } catch (error) {
    next(error);
  }
};

const getLead = async (req, res, next) => {
  try {
    const lead = await leadService.getLeadById(req.params.id, req.user);
    if (!lead) return next(createApiError(404, "Lead not found"));
    res.send({ lead });
  } catch (error) {
    next(error);
  }
};

const getLeadTimeline = async (req, res, next) => {
  try {
    const timeline = await leadService.getLeadTimelineById(
      req.params.id,
      req.user,
    );
    if (!timeline) return next(createApiError(404, "Lead not found"));
    res.send({ timeline });
  } catch (error) {
    next(error);
  }
};

const updateLead = async (req, res, next) => {
  try {
    const lead = await leadService.updateLead(
      req.params.id,
      req.body,
      req.user,
    );
    if (!lead) return next(createApiError(404, "Lead not found"));
    res.send({ message: "Lead updated successfully", lead });
  } catch (error) {
    next(error);
  }
};

const updateLeadStatus = async (req, res, next) => {
  try {
    const lead = await leadService.updateLeadStatus(
      req.params.id,
      req.body.status,
      req.user,
    );
    if (!lead) return next(createApiError(404, "Lead not found"));
    res.send({ message: "Lead status updated successfully", lead });
  } catch (error) {
    next(error);
  }
};

const convertLead = async (req, res, next) => {
  let session;
  try {
    session = await startTransaction();
    const conversion = await leadService.convertLead(
      req.params.id,
      req.body,
      req.user,
      session,
    );
    if (!conversion) {
      await abortTransaction(session);
      return next(createApiError(404, "Lead not found"));
    }
    await commitTransaction(session);
    res.status(201).send({
      message: "Lead converted successfully",
      ...conversion,
    });
  } catch (error) {
    if (session?.inTransaction()) {
      try {
        await abortTransaction(session);
      } catch (abortError) {
        error.abortError = abortError;
      }
    }
    next(error);
  } finally {
    if (session) await session.endSession();
  }
};

const assignLead = async (req, res, next) => {
  try {
    const lead = await leadService.assignLead(
      req.params.id,
      req.body.assignedExecutive,
      req.user,
    );
    if (!lead) return next(createApiError(404, "Lead not found"));
    res.send({ message: "Lead assigned successfully", lead });
  } catch (error) {
    next(error);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    const deleted = await leadService.deleteLead(req.params.id, req.user);
    if (!deleted) return next(createApiError(404, "Lead not found"));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export default {
  createLead,
  listLeads,
  getLead,
  getLeadTimeline,
  updateLead,
  updateLeadStatus,
  convertLead,
  assignLead,
  deleteLead,
};
