const express = require("express");
const bookingController = require("../controllers/booking.controller");

const router = express.Router();

router.get("/", bookingController.getAllBookings);
router.get("/:id", bookingController.getBookingById);
router.post("/", bookingController.createBooking);

module.exports = router;
