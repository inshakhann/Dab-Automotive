const bayRepo = require("./bay.repository");

const getAllBays = () => bayRepo.findAll();
const createBay = (name, description) => bayRepo.insertBay(name, description);

module.exports = {
  getAllBays,
  createBay,
};