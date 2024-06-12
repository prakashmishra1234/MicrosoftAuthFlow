exports.handler = async (event) => {
  if (event.triggerSource === "DefineAuthChallenge_Authentication") {
    if (event.request.session.length === 0) {
      event.response.issueTokens = false;
      event.response.failAuthentication = false;
      event.response.challengeName = "CUSTOM_CHALLENGE";
    } else if (
      event.request.session.length === 1 &&
      event.request.session[0].challengeName === "CUSTOM_CHALLENGE" &&
      event.request.session[0].challengeResult === true
    ) {
      event.response.issueTokens = true;
      event.response.failAuthentication = false;
    } else {
      event.response.issueTokens = false;
      event.response.failAuthentication = true;
    }
  } else if (event.triggerSource === "CreateAuthChallenge_Authentication") {
    if (event.request.challengeName === "CUSTOM_CHALLENGE") {
      event.response.publicChallengeParameters = {};
      event.response.privateChallengeParameters = { answer: "customAnswer" };
      event.response.challengeMetadata = "CUSTOM_CHALLENGE";
    }
  } else if (
    event.triggerSource === "VerifyAuthChallengeResponse_Authentication"
  ) {
    if (
      event.request.challengeName === "CUSTOM_CHALLENGE" &&
      event.request.challengeAnswer === "customAnswer"
    ) {
      event.response.answerCorrect = true;
    } else {
      event.response.answerCorrect = false;
    }
  }
  return event;
};
