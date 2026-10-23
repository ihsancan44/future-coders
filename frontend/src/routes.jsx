/* eslint-disable react-refresh/only-export-components -- yönlendirme tablosu, bileşen dosyası değil */
import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";
import { GuestOnly, RequireAdmin, RequireAuth } from "./components/Guards";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Ana sayfa dışındaki sayfalar ayrı dosyalara bölünür ve açıldıklarında yüklenir: ilk açılış hızlanır.
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const FinalExam = lazy(() => import("./pages/FinalExam"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Placement = lazy(() => import("./pages/Placement"));
const Profile = lazy(() => import("./pages/Profile"));
const CareerPicker = lazy(() => import("./pages/CareerPicker"));
const CareerRoadmap = lazy(() => import("./pages/CareerRoadmap"));
const Compiler = lazy(() => import("./pages/Compiler"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const CourseEditor = lazy(() => import("./pages/admin/CourseEditor"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const BlogEditor = lazy(() => import("./pages/admin/BlogEditor"));
const AdminExams = lazy(() => import("./pages/admin/AdminExams"));
const ExamEditor = lazy(() => import("./pages/admin/ExamEditor"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments"));
const AdminVideos = lazy(() => import("./pages/admin/AdminVideos"));

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
      { path: "compiler", element: <Compiler /> },
      { path: "login", element: <GuestOnly><Login /></GuestOnly> },
      { path: "register", element: <GuestOnly><Register /></GuestOnly> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "placement", element: <RequireAuth><Placement /></RequireAuth> },
      { path: "profile", element: <RequireAuth><Profile /></RequireAuth> },
      { path: "career", element: <RequireAuth><CareerPicker /></RequireAuth> },
      { path: "career/:key", element: <RequireAuth><CareerRoadmap /></RequireAuth> },
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
      { path: "videos", element: <AdminVideos /> },
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
