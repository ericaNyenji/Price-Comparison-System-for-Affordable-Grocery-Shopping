import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Heart, Bell, User } from "lucide-react"; // modern icon set
import "./TopNav.css";

const TopNav = ({ userType }) => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeIcon, setActiveIcon] = useState("home");
  const name = sessionStorage.getItem("name") || "User";

  // Close profile menu when clicking outside
  const handleClickOutside = (event) => {
    if (!event.target.closest(".avatar-wrapper")) {
      setShowProfileMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const goToHome = () => {
    setActiveIcon("home");
    if (userType === "customer") navigate("/customer-dashboard");
    else if (userType === "owner") navigate("/owner-dashboard");
    else navigate("/");
  };

  const goToFavorites = () => {
    setActiveIcon("favorites");
    navigate("/favorites");
  };

  const goToAlerts = () => {
    setActiveIcon("alerts");
    navigate("/alerts");
  };

  const goToProfile = () => {
    setActiveIcon("profile");
    navigate("/profile");
  };

  const confirmLogout = () => {
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div className="top-nav">
      <div className="icon-bar">
        <Home
          size={20}
          className={`nav-icon ${activeIcon === "home" ? "active" : ""}`}
          onClick={goToHome}
        />

        {userType === "customer" && (
          <>
            <Heart
              size={20}
              className={`nav-icon ${activeIcon === "favorites" ? "active" : ""}`}
              onClick={goToFavorites}
            />
            <Bell
              size={20}
              className={`nav-icon ${activeIcon === "alerts" ? "active" : ""}`}
              onClick={goToAlerts}
            />
          </>
        )}
      </div>


      <div className="avatar-container">
  <p className="user-greeting">Hello, {name}</p>

  <div
    className="avatar-wrapper"
    onClick={(e) => {
      e.stopPropagation();
      setShowProfileMenu((prev) => !prev);
      setActiveIcon("profile");
    }}
  >
    <div className={`avatar-circle ${activeIcon === "profile" ? "active" : ""}`}>
      <User size={20} className="avatar-icon" />
    </div>

    {showProfileMenu && (
      <div className="profile-menu">
        <div
          className="profile-menu-item"
          onClick={() => {
            goToProfile();
            setShowProfileMenu(false);
          }}
        >
          My Profile
        </div>
        <div className="profile-menu-item" onClick={confirmLogout}>
          Logout
        </div>
      </div>
    )}
  </div>
</div>

    </div>
  );
};

export default TopNav;
