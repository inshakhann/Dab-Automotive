const customerService = require("./customer.service");

const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const customer = await customerService.getCustomerByUserId(userId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

const createMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { address, city } = req.body;

    const customer = await customerService.createCustomer(
      userId,
      address,
      city
    );

    if (!customer) {
      return res.status(409).json({
        success: false,
        message: "Customer profile already exists",
      });
    }

    res.status(201).json({
      success: true,
      message: "Customer profile created",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { address, city } = req.body;

    if (address === undefined && city === undefined) {
      return res.status(400).json({
        success: false,
        message: "Provide address or city to update",
      });
    }

    const currentCustomer = await customerService.getCustomerByUserId(userId);

    if (!currentCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found",
      });
    }

    const customer = await customerService.updateCustomer(
      userId,
      address ?? currentCustomer.address,
      city ?? currentCustomer.city
    );

    res.status(200).json({
      success: true,
      message: "Customer profile updated",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
};
