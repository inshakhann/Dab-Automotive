const vehicleService = require("./vehicle.service");
const customerService = require("../customers/customer.service");

const getMyVehicles = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerByUserId(req.user.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found",
      });
    }

    const vehicles = await vehicleService.getVehicles(customer.customer_id);

    res.status(200).json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

const addVehicle = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerByUserId(req.user.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Create your customer profile first",
      });
    }

    const { make, model, year, plate_no, fuel_type, mileage } = req.body;

    if (!make || !model || !year || !plate_no) {
      return res.status(400).json({
        success: false,
        message: "Make, model, year and plate number are required",
      });
    }

    const vehicle = await vehicleService.createVehicle(
      customer.customer_id,
      { make, model, year, plate_no, fuel_type, mileage }
    );

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      data: vehicle,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This plate number already exists",
      });
    }

    next(error);
  }
};

const updateMyVehicle = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerByUserId(req.user.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found",
      });
    }

    const vehicle = await vehicleService.updateVehicle(
      customer.customer_id,
      req.params.vehicleId,
      req.body
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

const deleteMyVehicle = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerByUserId(req.user.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found",
      });
    }

    const vehicle = await vehicleService.deleteVehicle(
      customer.customer_id,
      req.params.vehicleId
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const getVehicleHistory = async (req, res, next) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid vehicle ID is required",
      });
    }

    const role = (req.user.role || "").toLowerCase();
    let vehicle = null;

    if (role === "owner" || role === "admin" || role === "administrator") {
      vehicle = await vehicleService.getVehicleByIdForOwner(vehicleId);
    } else {
      const customer = await customerService.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer profile not found",
        });
      }
      vehicle = await vehicleService.getVehicleById(customer.customer_id, vehicleId);
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or access denied",
      });
    }

    const historyData = await vehicleService.getVehicleMaintenanceHistory(vehicleId);

    res.status(200).json({
      success: true,
      data: {
        vehicle: {
          vehicle_id: vehicle.vehicle_id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          plate_no: vehicle.plate_no,
          mileage: vehicle.mileage,
        },
        ...historyData,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyVehicles,
  addVehicle,
  updateMyVehicle,
  deleteMyVehicle,
  getVehicleHistory,
};
