const express = require("express");
const bookingController = require("./booking.controller");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const {
  bookingIdValidation,
  availableSlotsValidation,
  createBookingValidation,
  updateBookingValidation,
} = require("./booking.validation");

const router = express.Router();

router.use(authenticate);

router.get("/", bookingController.getAllBookings);
router.get("/available-slots", availableSlotsValidation, validate, bookingController.getAvailableSlots);
router.get("/:id", bookingIdValidation, validate, bookingController.getBookingById);
router.post("/", createBookingValidation, validate, bookingController.createBooking);
router.patch("/:id", updateBookingValidation, validate, bookingController.updateBooking);
router.delete("/:id", bookingIdValidation, validate, bookingController.cancelBooking);

module.exports = router;