import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import './AppContent.css';
import TopNav from "./components/TopNav";
import HomePage from "./pages/HomePage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import CustomerDashboard from "./pages/CustomerDashboard";
import SupermarketOwnerDashboard from "./pages/SupermarketOwnerDashboard";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import ProductDetails from "./pages/ProductDetails";
import CategoryPage from './pages/CategoryPage';
import EditProduct from './pages/EditProduct';
import Alerts from "./pages/Alerts";
import Review from "./pages/Review";
import OwnerCategoryPage from './pages/OwnerCategoryPage';
//AppContent component wraps your entire app’s routing. It conditionally renders the TopNav component based on the current route and user type.

const AppContent = () => {
  const location = useLocation();
  const [userType, setUserType] = useState("");
  

  useEffect(() => {
    const storedUserType = sessionStorage.getItem("role");
    if (storedUserType) {
      setUserType(storedUserType);
    }
  }, [location.pathname]);  // << updates on page change

  return (
    <>
      <div className="top-bar">
        <div
          className="logo"
          // style={{ cursor: "pointer" }}
          // onClick={() => navigate("/")}
        >
          <span style={{ fontSize: "48px", marginRight: "5px", marginTop: "1px", marginBottom: "7px"  }}>🛒</span>
          Price Comparison System
        </div>
      </div>

      {location.pathname !== "/" && location.pathname !== "/login" && location.pathname !== "/register" && (
        <TopNav userType={userType} />
      )}      {/* You show <TopNav /> everywhere except on Home (/), Login pages & Register Pages*/}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
        {/* <Route path="/customer-dashboard" element={<div className="main-content"><CustomerDashboard /> </div>} /> */}
        <Route path="/owner-dashboard" element={<SupermarketOwnerDashboard />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/products-details/:id" element={<ProductDetails />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/edit-product/:product_id" element={<EditProduct />} />
        <Route path="/review/:productId/location/:locationId/price/:price" element={<Review />} />
        <Route path="/owner-category/:categoryId" element={<OwnerCategoryPage />} />
      </Routes>
    </>
  );
};

export default AppContent;
