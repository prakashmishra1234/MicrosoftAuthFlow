import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MicrosoftCallBack from "./pages/MicrosoftCallBack";
import GoogleCallback from "./pages/GoogleCallback";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/msresponse",
    element: <MicrosoftCallBack />,
  },
  {
    path: "/googlecallback",
    element: <GoogleCallback />,
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
