import analyticsService from "../services/analytics.service.js";

const getDashboard = async (req, res, next) => {
  try {
    res.send(await analyticsService.getDashboard(req.user));
  } catch (error) {
    next(error);
  }
};

const getPipeline = async (req, res, next) => {
  try {
    res.send({ stages: await analyticsService.getPipeline(req.user) });
  } catch (error) {
    next(error);
  }
};

const getTeamPerformance = async (req, res, next) => {
  try {
    res.send({
      team: await analyticsService.getTeamPerformance(req.user),
    });
  } catch (error) {
    next(error);
  }
};

export default { getDashboard, getPipeline, getTeamPerformance };
