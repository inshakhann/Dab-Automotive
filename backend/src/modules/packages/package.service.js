const packageRepo = require("./package.repository");

const getAllPackages = () => packageRepo.findAll();
const getPackageById = (id) => packageRepo.findById(id);
const createPackage = (name, description, price, duration, serviceIds) =>
  packageRepo.insertPackageWithServices(name, description, price, duration, serviceIds);

module.exports = {
  getAllPackages,
  getPackageById,
  createPackage,
};