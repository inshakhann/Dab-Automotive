const packageService = require("./package.service");

const getAllPackages = async (req, res, next) => {
  try {
    const packages = await packageService.getAllPackages();

    res.status(200).json({
      success: true,
      data: packages
    });
  } catch (error) {
    next(error);
  }
};

const getPackageById = async (req, res, next) => {
  try {
    const packageData = await packageService.getPackageById(req.params.id);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found"
      });
    }

    res.status(200).json({
      success: true,
      data: packageData
    });
  } catch (error) {
    next(error);
  }
};

const createPackage = async (req, res, next) => {
  try {
    const { name, description, price, duration, serviceIds } = req.body;

    if (!name || price === undefined || duration === undefined ||
        !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name, price, duration and serviceIds are required"
      });
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0 ||
        !Number.isInteger(Number(duration)) || Number(duration) <= 0 ||
        !serviceIds.every(id => Number.isInteger(Number(id)) && Number(id) > 0)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package details or service IDs"
      });
    }

    const packageData = await packageService.createPackage(
      name,
      description || null,
      Number(price),
      Number(duration),
      [...new Set(serviceIds.map(Number))]
    );

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: packageData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPackages,
  getPackageById,
  createPackage
};
