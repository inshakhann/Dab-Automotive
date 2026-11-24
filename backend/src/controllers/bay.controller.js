const bayService = require("../services/bay.service");

const getAllBays = async (req, res, next) => {
  try {
    const bays = await bayService.getAllBays();

    res.status(200).json({
      success: true,
      data: bays
    });
  } catch (error) {
    next(error);
  }
};

const createBay = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bay name is required"
      });
    }

    const bay = await bayService.createBay(
      name.trim(),
      description || null
    );

    res.status(201).json({
      success: true,
      message: "Workshop bay created successfully",
      data: bay
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBays,
  createBay
};
