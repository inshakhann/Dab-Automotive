const bayRepo = require("../modules/bays/bay.repository");

const getAllBays = () => bayRepo.findAll();
const createBay = (name, description) => bayRepo.insertBay(name, description);

module.exports = {
  getAllBays,
  createBay,
};