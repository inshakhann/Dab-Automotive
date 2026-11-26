const vehicleRepo = require("../modules/vehicles/vehicle.repository");

const getVehicles = (customerId) => vehicleRepo.findAllByCustomerId(customerId);
const getVehicleById = (customerId, vehicleId) => vehicleRepo.findByIdAndCustomer(customerId, vehicleId);
const getVehicleByIdForOwner = (vehicleId) => vehicleRepo.findByIdWithOwner(vehicleId);
const createVehicle = (customerId, vehicle) => vehicleRepo.insertVehicle(customerId, vehicle);
const updateVehicle = (customerId, vehicleId, vehicle) => vehicleRepo.updateVehicleById(customerId, vehicleId, vehicle);

const deleteVehicle = async (customerId, vehicleId) => {
  const active = await vehicleRepo.countActiveBookingsForVehicle(vehicleId);
  if (active) {
    const error = new Error("Vehicle with active bookings cannot be deleted");
    error.status = 400;
    throw error;
  }
  return vehicleRepo.softDeleteVehicle(customerId, vehicleId);
};

const getVehicleMaintenanceHistory = async (vehicleId) => {
  const hasJobCardsTable = await vehicleRepo.checkJobCardsTableExists();

  if (hasJobCardsTable) {
    const records = await vehicleRepo.findHistoryWithJobCards(vehicleId);
    return { source: "bookings_and_job_cards", records };
  }

  const records = await vehicleRepo.findHistoryFromBookings(vehicleId);
  return {
    source: "service_bookings",
    note: "Job card details will automatically appear once the job_cards module is merged.",
    records,
  };
};

module.exports = {
  getVehicles,
  getVehicleById,
  getVehicleByIdForOwner,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleMaintenanceHistory,
};