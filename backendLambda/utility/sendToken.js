const sendToken = (cookies, message, statusCode) => {
  const resp = {
    statusCode: statusCode,
    headers: {
      "Set-Cookie": cookies.join(", "),
      "Content-Type": "application/json",
    },
    message: message,
  };
  return resp;
};

module.exports = sendToken;
