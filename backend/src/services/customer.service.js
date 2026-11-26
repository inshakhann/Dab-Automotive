const customerRepo = require("../modules/customers/customer.repository");

const getCustomerByUserId = (userId) => customerRepo.findByUserId(userId);
const createCustomer = (userId, address, city) => customerRepo.insertCustomer(userId, address, city);
const updateCustomer = (userId, address, city) => customerRepo.updateCustomerByUserId(userId, address, city);

module.exports = {
  getCustomerByUserId,
  createCustomer,
  updateCustomer,
};