const sendData = (data, message, statusCode) => {
  return {
    success: true,
    statusCode: statusCode,
    message: message,
    data: data,
  };
};

module.exports = sendData;
