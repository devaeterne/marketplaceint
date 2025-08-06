import { NotificationProvider } from "./context/NotificationContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProductPage from "./pages/product/index";
import FinalProductPage from "./pages/product/finalProduct";
import FinalProductCreatePage from "./pages/product/finalProductCreate";
import Category from "./pages/product/Category";
import CategoryCreateForm from "@/components/product/CategoryCreateForm";
import TagsPage from "./pages/product/Tag";
import TagsCreateForm from "./components/product/TagsCreateForm";
import FinalProductEditPage from "./pages/product/finalProductEdit";

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* ProtectedRoute -> AppLayout -> Protected Pages */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index path="/" element={<Home />} />
                <Route path="/profile" element={<UserProfiles />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/blank" element={<Blank />} />
                <Route path="/form-elements" element={<FormElements />} />
                <Route path="/basic-tables" element={<BasicTables />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/avatars" element={<Avatars />} />
                <Route path="/badge" element={<Badges />} />
                <Route path="/buttons" element={<Buttons />} />
                <Route path="/images" element={<Images />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/line-chart" element={<LineChart />} />
                <Route path="/bar-chart" element={<BarChart />} />
                <Route path="/products" element={<ProductPage />} />
                <Route path="/final-products" element={<FinalProductPage />} />
                <Route path="/final-products/create" element={<FinalProductCreatePage />} />
                <Route path="/final-products/edit/:id" element={<FinalProductEditPage />} />
                <Route path="/categories" element={<Category />} />
                <Route path="/categories/create" element={<CategoryCreateForm />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/tags/create" element={<TagsCreateForm />} />
              </Route>
            </Route>

            {/* Public Pages (Auth) */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
