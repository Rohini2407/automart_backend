const errorHandler = (err, req, res, next) => {
  console.error(`[Middleware Error] ${err.message}`);
  res.status(err.status || 500).json({
    status: String(err.status || 500),
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
