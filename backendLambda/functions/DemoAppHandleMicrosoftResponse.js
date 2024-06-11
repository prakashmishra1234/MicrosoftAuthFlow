const sendData = require("../utility/sendData");
const sendToken = require("../utility/sendToken");
const axios = require("axios");
const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminLinkProviderForUserCommand,
  AdminInitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION_FOR_COGNITO,
});
const userPoolId = process.env.COGNITO_USER_POOL_ID;

exports.handler = async (event) => {
  console.log("query string parameters : ", event.queryStringParameters);

  if (!event.queryStringParameters) {
    console.log("Invalid request body.");
    return sendData(null, "Invalid request body.", 400);
  }

  if (!event.queryStringParameters.code) {
    console.log("code is not present");
    return sendData(null, "Code is required", 400);
  }

  if (!event.queryStringParameters.state) {
    console.log("state is not present");
    return sendData(null, "State is required", 400);
  }

  if (event.queryStringParameters.state !== process.env.MICROSOFT_OAUTH_STATE) {
    console.log("State does not match.");
    return sendData(null, "Invalid state parameter", 400);
  }

  try {
    const tokenResponse = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID,
        client_secret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET,
        code: event.queryStringParameters.code,
        redirect_uri: process.env.MICROSOFT_OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("response in exchange of code : ", tokenResponse);

    const { access_token, id_token } = tokenResponse.data;

    const profileResponse = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const profile = profileResponse.data;

    console.log("user profile from microsoft : ", profile);

    const email = profile.mail || profile.userPrincipalName;

    if (!email) {
      console.log("Email not found in user profile.");
      return sendData(null, "Email not found in user profile.", 400);
    }

    const userListCommand = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
    });

    const userList = await cognitoClient.send(userListCommand);

    if (userList.Users.length === 0) {
      console.log("User not found.");
      return sendData(null, "User not found.", 200);
    }

    console.log("user from cognito : ", userList.Users[0]);

    const cognitoUser = userList.Users[0];
    const identitiesAttribute = cognitoUser.Attributes.find(
      (attr) => attr.Name === "identities"
    );
    let identities = [];

    if (identitiesAttribute) {
      identities = JSON.parse(identitiesAttribute.Value);
    }

    const microsoftIdentityExists = identities.some(
      (identity) => identity.providerName === "microsoft"
    );

    if (!microsoftIdentityExists) {
      const jsonToAddProvider = {
        DestinationUser: {
          ProviderAttributeValue: userList.Users[0].Username,
          ProviderName: "Cognito",
        },
        SourceUser: {
          ProviderAttributeName: "Cognito_Subject",
          ProviderAttributeValue: profile.id,
          ProviderName: "microsoft",
        },
        UserPoolId: userPoolId,
      };

      console.log("Json to add provider : ", jsonToAddProvider);

      const linkProviderCommand = new AdminLinkProviderForUserCommand(
        jsonToAddProvider
      );
      await cognitoClient.send(linkProviderCommand);
    }

    const authCommand = new AdminInitiateAuthCommand({
      UserPoolId: userPoolId,
      ClientId: process.env.COGNITO_APP_CLIENT_ID,
      AuthFlow: "USER_SRP_AUTH",
      AuthParameters: {
        USERNAME: email,
        SRP_A: access_token,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    console.log("auth response : ", authResponse);

    const cookies = [
      `idToken=${authResponse.AuthenticationResult.IdToken}; Path=/; HttpOnly`,
      `accessToken=${authResponse.AuthenticationResult.AccessToken}; Path=/; HttpOnly`,
      `refreshToken=${authResponse.AuthenticationResult.RefreshToken}; Path=/; HttpOnly`,
    ];

    console.log("cookies : ", cookies);

    return sendToken(cookies, "User logged in successfully", 200);
  } catch (error) {
    console.error("Error message:", error);
    return sendData(null, "Something went wrong.", 400);
  }
};