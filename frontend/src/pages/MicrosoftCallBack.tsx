import axios from "axios";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signIn, confirmSignIn } from "@aws-amplify/auth";
import awsmobile from "../aws-exports";
import { Amplify } from "aws-amplify";

Amplify.configure(awsmobile);

const handleSignIn = async (username: string, challengeResponse: string) => {
  try {
    const { nextStep } = await signIn({
      username,
      options: {
        authFlowType: "CUSTOM_WITHOUT_SRP",
      },
    });
    console.log("sign in output : ", nextStep);
    if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE") {
      try {
        const output = await confirmSignIn({ challengeResponse });
        console.log("handleSignIn output : ", output);
      } catch (err) {
        console.log(err);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const MicrosoftCallBack = () => {
  const location = useLocation();
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  const getParamsValue = (
    search: string
  ): {
    code: string | null;
    state: string | null;
  } => {
    let params: {
      code: string | null;
      state: string | null;
    } = {
      code: "",
      state: "",
    };
    const searchParams = new URLSearchParams(search);
    params.code = searchParams.get("code");
    params.state = searchParams.get("state");
    return params;
  };

  const handleSignIn = async (username: string, challengeResponse: string) => {
    try {
      const { nextStep } = await signIn({
        username,
        options: {
          authFlowType: "CUSTOM_WITHOUT_SRP",
        },
      });
      console.log("sign in output : ", nextStep);
      if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE") {
        try {
          const output = await confirmSignIn({ challengeResponse });
          console.log("handleSignIn output : ", output);
          if (output.isSignedIn) {
            navigate("/");
          }
        } catch (err) {
          console.log(err);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  React.useEffect(() => {
    setLoading(true);
    const params = getParamsValue(location.search);
    axios
      .get(
        `https://7an16zjr4a.execute-api.ap-south-1.amazonaws.com/dev/auth/microsoftres`,
        {
          params: {
            code: params.code,
          },
        }
      )
      .then((res) => {
        handleSignIn(res.data.email, res.data.customChallengeAnswer);
      })
      .catch((err) => {
        console.log(err);
        navigate("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return <div>{loading ? "Loading..." : "MicrosoftCallBack"}</div>;
};

export default MicrosoftCallBack;
