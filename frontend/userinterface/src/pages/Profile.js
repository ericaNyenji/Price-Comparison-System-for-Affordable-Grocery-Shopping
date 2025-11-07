import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const userId = sessionStorage.getItem("userId");
  const token = sessionStorage.getItem("token");
  const userRole = sessionStorage.getItem("role");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!userId || !token) {
          setError("Please log in to view your profile");
          return;
        }

      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/${userId}`, {headers: {Authorization: `Bearer ${token}`}});
        
        console.log("User data from API:", res.data.user);
        console.log("User role from session:", userRole);
        setUser(res.data.user);
        setError(null);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (error.response?.status === 401) {
          if (error.response.data.error === "Token expired") {
            sessionStorage.clear();
            setError("Your session has expired. Please log in again.");
            setTimeout(() => navigate("/login"), 2000);
          } else {
            setError("Please log in to view your profile");
          }
        } else {
          setError("Failed to load profile. Please try again later.");
        }
      }
    };

    fetchUserData();
  }, [userId, token, navigate]);

  

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Profile</h2>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!user) return <p className="loading-text">Loading profile...</p>;

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      <img
        src="/images/profile.png"
        alt="Profile"
        className="profile-image"
      />
      <p><strong>Full Name:</strong> {user.username}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Country:</strong> {user.country}</p>
      {userRole === "owner" && (
        <p><strong>Supermarket Location:</strong> {user.location || "Not set"}</p>
      )}
    </div>
  );
};

export default Profile;
