import axios from "axios";
import React from "react";

const Login = () => {
  const [loading, setLoading] = React.useState(false);
  const handleLoginWithMicrosoft = () => {
    setLoading(true);
    axios
      .get(
        "https://7an16zjr4a.execute-api.ap-south-1.amazonaws.com/dev/auth/microsoft"
      )
      .then((res) => {
        window.location.href = res.data.data;
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  };
  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <button onClick={handleLoginWithMicrosoft}>Login with Microsoft</button>
      )}
    </div>
  );
};

export default Login;
