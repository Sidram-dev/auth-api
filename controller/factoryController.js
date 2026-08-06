const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    const response = doc.toObject();
    delete response.password;

    res.status(201).json({
      success: true,
      message: "Document created successfully",
      data: response,
    });
  });

exports.getOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      success: true,
      message: "Document retrieved successfully",
      data: doc,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      success: true,
      message: "Document updated successfully",
      data: doc,
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      {
        new: true,
        runValidators: true,
      },
    );
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      data: doc,
    });
  });

