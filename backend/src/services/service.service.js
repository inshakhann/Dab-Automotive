const serviceRepo = require("../modules/services/service.repository");

const getAllServices = () => serviceRepo.findAll();
const getServiceById = (id) => serviceRepo.findById(id);
const createService = (name, description, price, duration) =>
  serviceRepo.insertService(name, description, price, duration);
const updateService = (id, name, description, price, duration) =>
  serviceRepo.updateServiceById(id, name, description, price, duration);

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
};