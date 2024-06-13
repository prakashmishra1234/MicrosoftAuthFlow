const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminLinkProviderForUserCommand,
  AdminInitiateAuthCommand,
  RespondToAuthChallengeCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const axios = require("axios");

const sendData = require("../utility/sendData");
const sendToken = require("../utility/sendToken");

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION_FOR_COGNITO,
});

const userPoolId = process.env.COGNITO_USER_POOL_ID;

exports.handler = async (event) => {
  console.log("Query string parameters:", event.queryStringParameters);

  if (!event.queryStringParameters) {
    console.log("Invalid request body.");
    return sendData(null, "Invalid request body.", 400);
  }

  if (!event.queryStringParameters.code) {
    console.log("Code is not present");
    return sendData(null, "Code is required", 400);
  }

  if (!event.queryStringParameters.state) {
    console.log("State is not present");
    return sendData(null, "State is required", 400);
  }

  if (event.queryStringParameters.state !== process.env.MICROSOFT_OAUTH_STATE) {
    console.log("State is invalid");
    return sendData(null, "State is invalid", 400);
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

    console.log("Response in exchange of code:", tokenResponse);

    const { access_token, id_token } = tokenResponse.data;

    const profileResponse = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const profile = profileResponse.data;
    console.log("User profile from Microsoft:", profile);

    const email = profile.mail || profile.userPrincipalName;

    if (!email) {
      console.log("Email not found in user profile.");
      return sendData(null, "Email not found in user profile.", 400);
    }

    const userListCommand = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
    });

    console.log("Sending ListUsersCommand with params:", userListCommand);
    const userList = await cognitoClient.send(userListCommand);
    console.log("ListUsersCommand response:", userList);

    if (userList.Users.length === 0) {
      console.log("User not found.");
      return sendData(null, "User not found.", 200);
    }

    console.log("User from Cognito:", userList.Users[0]);

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

      console.log("JSON to add provider:", jsonToAddProvider);

      const linkProviderCommand = new AdminLinkProviderForUserCommand(
        jsonToAddProvider
      );
      console.log(
        "Sending AdminLinkProviderForUserCommand with params:",
        linkProviderCommand
      );
      await cognitoClient.send(linkProviderCommand);
      console.log("AdminLinkProviderForUserCommand sent successfully");
    } else {
      console.log("Microsoft provider already linked.");
    }

    const initiateAuthParams = {
      UserPoolId: userPoolId,
      ClientId: process.env.COGNITO_APP_CLIENT_ID,
      AuthFlow: "CUSTOM_AUTH",
      AuthParameters: {
        USERNAME: email,
      },
    };

    const initiateAuthCommand = new AdminInitiateAuthCommand(
      initiateAuthParams
    );

    console.log(
      "Sending AdminInitiateAuthCommand with params:",
      initiateAuthCommand
    );

    const response = await cognitoClient.send(initiateAuthCommand);
    console.log("AdminInitiateAuthCommand response:", response);

    const { ChallengeName, Session, ChallengeParameters } = response;
    const { SECRET_BLOCK, USER_ID_FOR_SRP } = ChallengeParameters;

    const challengeResponseParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_APP_CLIENT_ID,
      ChallengeName: ChallengeName,
      Session: Session,
      ChallengeResponses: {
        USERNAME: email,
        ANSWER: "customAnswer", // The answer that your Lambda function expects
      },
    };

    const respondToAuthChallengeCommand = new RespondToAuthChallengeCommand(
      challengeResponseParams
    );
    console.log(
      "Sending RespondToAuthChallengeCommand with params:",
      respondToAuthChallengeCommand
    );

    const authResponse = await cognitoClient.send(
      respondToAuthChallengeCommand
    );
    console.log("RespondToAuthChallengeCommand response:", authResponse);

    const cookies = [
      `idToken=${authResponse.AuthenticationResult.IdToken}; Path=/; HttpOnly`,
      `accessToken=${authResponse.AuthenticationResult.AccessToken}; Path=/; HttpOnly`,
      `refreshToken=${authResponse.AuthenticationResult.RefreshToken}; Path=/; HttpOnly`,
    ];

    console.log("Cookies:", cookies);

    return sendToken(cookies, "User logged in successfully", 200);
  } catch (error) {
    console.error("Error message:", error);
    return sendData(null, `Authentication failed: ${error.message}`, 400);
  }
};
