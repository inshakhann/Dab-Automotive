const express = require("express");
const bookingController = require("../controllers/booking.controller");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.get("/", bookingController.getAllBookings);
router.get("/available-slots", bookingController.getAvailableSlots);
router.get("/:id", bookingController.getBookingById);
router.post("/", bookingController.createBooking);
router.patch("/:id", bookingController.updateBooking);
router.delete("/:id", bookingController.cancelBooking);

module.exports = router;

