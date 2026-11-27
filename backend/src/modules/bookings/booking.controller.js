const bookingService = require("./booking.service");
const customerService = require("../customers/customer.service");

const getCustomerId = async (userId) => {
  const customer = await customerService.getCustomerByUserId(userId);
  return customer ? customer.customer_id : null;
};

const getAllBookings = async (req, res, next) => {
  try {
    const customerId = await getCustomerId(req.user.id);

    if (!customerId) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }

    const bookings = await bookingService.getAllBookings(customerId);

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const bookingId = Number(req.params.id);

    if (!customerId) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }

    if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await bookingService.getBookingById(bookingId, customerId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

const createBooking = async (req, res, next) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const { vehicleId, packageId, startTime } = req.body;

    if (!customerId) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }

    const vehicle = Number(vehicleId);
    const servicePackage = Number(packageId);

    if (
      !Number.isSafeInteger(vehicle) || vehicle <= 0 ||
      !Number.isSafeInteger(servicePackage) || servicePackage <= 0 ||
      !startTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid vehicle, package and start time are required"
      });
    }

    const booking = await bookingService.createBooking(
      customerId, vehicle, servicePackage, startTime
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking
    });
  } catch (error) {
    if (error.message.includes("not belong") ||
        error.message.includes("not found") ||
        error.message.includes("future") ||
        error.message.includes("No workshop bay")) {
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  }
};

const updateBooking = async (req, res, next) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const bookingId = Number(req.params.id);
    const { startTime } = req.body;

    if (!customerId) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }

    if (!Number.isSafeInteger(bookingId) || bookingId <= 0 || !startTime) {
      return res.status(400).json({
        success: false,
        message: "Valid booking ID and start time are required"
      });
    }

    const booking = await bookingService.updateBooking(
      bookingId, customerId, startTime
    );

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: booking
    });
  } catch (error) {
    if (["Booking not found", "Booking cannot be modified after job card creation",
         "Only active bookings can be modified", "Please provide a valid future booking time",
         "Package not found or inactive", "No workshop bay available for this time"].includes(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    const bookingId = Number(req.params.id);

    if (!customerId) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }

    if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await bookingService.cancelBooking(bookingId, customerId);

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking
    });
  } catch (error) {
    if (["Booking not found", "Booking cannot be cancelled after job card creation",
         "Only active bookings can be cancelled"].includes(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  }
};


const getAvailableSlots = async (req, res, next) => {
  try {
    const { date, packageId } = req.query;
    const id = Number(packageId);

    if (!date || !Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid date and package ID are required"
      });
    }

    const slots = await bookingService.getAvailableSlots(date, id);

    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    if (error.message.includes("Date") ||
        error.message.includes("Invalid") ||
        error.message.includes("Package")) {
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
  createBooking,
  updateBooking,
  cancelBooking,
  getAvailableSlots
};
