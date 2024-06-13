import axios from "axios";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
        console.log(res);
        if (res.data.statusCode === 200) navigate("/");
        else navigate("/login");
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
