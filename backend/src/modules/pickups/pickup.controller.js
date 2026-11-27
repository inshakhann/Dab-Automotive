const pickupService = require("./pickup.service");
const customerService = require("../customers/customer.service");

const estimatePickup = async (req, res, next) => {
  try {
    const lat = Number(req.body.latitude);
    const lng = Number(req.body.longitude);

    const estimate = pickupService.estimatePickupFee(lat, lng);

    res.status(200).json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    if (
      error.message.includes("Invalid") ||
      error.message.includes("configuration")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const createPickupRequest = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerByUserId(req.user.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found",
      });
    }

    const { bookingId, address, latitude, longitude } = req.body;

    const id = Number(bookingId);
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid booking ID is required",
      });
    }

    const pickup = await pickupService.createPickupRequest(
      customer.customer_id,
      id,
      address,
      lat,
      lng
    );

    res.status(201).json({
      success: true,
      data: pickup,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Pickup request already exists for this booking",
      });
    }

    if (
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("not available") ||
      error.message.includes("configuration")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

module.exports = {
  estimatePickup,
  createPickupRequest,
};