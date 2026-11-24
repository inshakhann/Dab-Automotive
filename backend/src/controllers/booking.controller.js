const bookingService = require("../services/booking.service");

const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getAllBookings();

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

const createBooking = async (req, res, next) => {
  try {
    const { customerId, vehicleId, packageId, startTime } = req.body;

    if (!customerId || !vehicleId || !packageId || !startTime) {
      return res.status(400).json({
        success: false,
        message: "Customer, vehicle, package and start time are required"
      });
    }

    const booking = await bookingService.createBooking(
      Number(customerId),
      Number(vehicleId),
      Number(packageId),
      startTime
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking
    });
  } catch (error) {
    if (
      error.message.includes("not belong") ||
      error.message.includes("not found") ||
      error.message.includes("future") ||
      error.message.includes("No workshop bay")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking
};
