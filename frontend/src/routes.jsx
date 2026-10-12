import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";
import { GuestOnly, RequireAdmin, RequireAuth } from "./components/Guards";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import FinalExam from "./pages/FinalExam";
import Roadmap from "./pages/Roadmap";
import BlogPost from "./pages/BlogPost";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Placement from "./pages/Placement";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/admin/Dashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import CourseEditor from "./pages/admin/CourseEditor";
import AdminBlog from "./pages/admin/AdminBlog";
import BlogEditor from "./pages/admin/BlogEditor";
import AdminExams from "./pages/admin/AdminExams";
import ExamEditor from "./pages/admin/ExamEditor";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminComments from "./pages/admin/AdminComments";

export const routes = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "courses", element: <Courses /> },
      { path: "courses/:id", element: <CourseDetail /> },
      { path: "courses/:id/final", element: <RequireAuth><FinalExam /></RequireAuth> },
      { path: "roadmap", element: <Roadmap /> },
      { path: "roadmap/:id", element: <BlogPost /> },
      { path: "login", element: <GuestOnly><Login /></GuestOnly> },
      { path: "register", element: <GuestOnly><Register /></GuestOnly> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "placement", element: <RequireAuth><Placement /></RequireAuth> },
      { path: "profile", element: <RequireAuth><Profile /></RequireAuth> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/admin",
    element: <RequireAdmin><AdminLayout /></RequireAdmin>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "courses", element: <AdminCourses /> },
      { path: "courses/:id", element: <CourseEditor /> },
      { path: "blog", element: <AdminBlog /> },
      { path: "blog/:id", element: <BlogEditor /> },
      { path: "exams", element: <AdminExams /> },
      { path: "exams/:id", element: <ExamEditor /> },
      { path: "users", element: <AdminUsers /> },
      { path: "comments", element: <AdminComments /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
