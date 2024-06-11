const sendData = require("../utility/sendData");

exports.handler = async (event) => {
  console.log(event);
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_OAUTH_CLIENT_ID}&redirect_uri=${process.env.MICROSOFT_OAUTH_REDIRECT_URI}&response_type=code&scope=openid profile email User.Read User.Read.All&response_mode=query&nonce=nonce&state=${process.env.MICROSOFT_OAUTH_STATE}&prompt=select_account`;
  console.log("url : ", url);
  return sendData(url, "Microsoft login initiated successfully.", 200);
};
