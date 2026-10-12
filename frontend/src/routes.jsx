import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/mainLayout";
import MainPage from "./pages/main-page/MainPage";
import LoginForm from "./pages/login/loginForm";
import SignForm from "./pages/signUp/signForm";
import Courses from "./pages/courses/courses";
import RoadMap from "./pages/roadmap/roadmap";
import ForgotPassword from "./pages/forgotPassword/forgotPasword";
import CourseInside from "./pages/course-card/course-inside";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <MainPage />,
      },
      {
        path: "/login-page",
        element: <LoginForm />,
      },
      {
        path: "/sign-page",
        element: <SignForm />,
      },
      {
        path: "/courses",
        element: <Courses />,
      },
      {
        path: "/roadmap",
        element: <RoadMap />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "/course-inside/:id",
        element: <CourseInside />,
      },
    ],
  },
]);
