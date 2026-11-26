const { calculateDistanceKm } = require("../adapters/maps.adapter");
const pickupRepo = require("../modules/pickups/pickup.repository");

const getWorkshopConfig = () => {
  const workshopLatitude = Number(process.env.WORKSHOP_LATITUDE);
  const workshopLongitude = Number(process.env.WORKSHOP_LONGITUDE);
  const feePerKm = Number(process.env.PICKUP_FEE_PER_KM);

  if (
    !Number.isFinite(workshopLatitude) ||
    workshopLatitude < -90 ||
    workshopLatitude > 90 ||
    !Number.isFinite(workshopLongitude) ||
    workshopLongitude < -180 ||
    workshopLongitude > 180 ||
    !Number.isFinite(feePerKm) ||
    feePerKm < 0
  ) {
    throw new Error("Workshop location or pickup fee configuration is missing");
  }

  return { workshopLatitude, workshopLongitude, feePerKm };
};

const estimatePickupFee = (latitude, longitude) => {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Invalid pickup latitude");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Invalid pickup longitude");
  }

  const { workshopLatitude, workshopLongitude, feePerKm } = getWorkshopConfig();
  const distance = calculateDistanceKm(latitude, longitude, workshopLatitude, workshopLongitude);
  const fee = Number((distance * feePerKm).toFixed(2));

  return {
    distance_km: distance,
    pickup_fee: fee,
    rate_per_km: feePerKm,
    currency: "PKR",
  };
};

const createPickupRequest = async (customerId, bookingId, address, latitude, longitude) => {
  if (!address || !address.trim()) {
    throw new Error("Pickup address is required");
  }

  const { distance_km, pickup_fee } = estimatePickupFee(latitude, longitude);
  const booking = await pickupRepo.findBookingForCustomer(bookingId, customerId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (!["pending", "confirmed"].includes(booking.status)) {
    throw new Error("Pickup is not available for this booking");
  }

  return pickupRepo.insertPickupRequest({
    bookingId,
    customerId,
    address: address.trim(),
    latitude,
    longitude,
    distance: distance_km,
    fee: pickup_fee,
  });
};

module.exports = {
  estimatePickupFee,
  createPickupRequest,
};