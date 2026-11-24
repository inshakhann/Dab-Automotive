const serviceService = require("../services/service.service");

const getAllServices = async (req, res, next) => {
  try {
    const services = await serviceService.getAllServices();

    res.status(200).json({
      success: true,
      data: services
    });
  } catch (error) {
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await serviceService.getServiceById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const { name, description, price, duration } = req.body;

    if (!name || price === undefined || duration === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, price and duration are required"
      });
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0 ||
        !Number.isInteger(Number(duration)) || Number(duration) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid price or duration"
      });
    }

    const service = await serviceService.createService(
      name,
      description || null,
      Number(price),
      Number(duration)
    );

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service
    });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { name, description, price, duration } = req.body;

    if (!name || price === undefined || duration === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, price and duration are required"
      });
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0 ||
        !Number.isInteger(Number(duration)) || Number(duration) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid price or duration"
      });
    }

    const service = await serviceService.updateService(
      req.params.id,
      name,
      description || null,
      Number(price),
      Number(duration)
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService
};
