import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css"; // Link to custom CSS

const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Compare Prices",
      description: "Find the best deals across multiple supermarkets in your city"
    },
    {
      title: "Real-time Updates",
      description: "Get the latest prices and product information"
    },
    {
      title: "Easy Search",
      description: "Quickly find products with our advanced search feature"
    }
  ];

  return (
    <div className="homepage-container">
      <div className="hero-section">
        <h1 className="main-title">Welcome to Price Comparison System</h1>
        <p className="subtitle">Find the best prices for your groceries across multiple supermarkets in your city</p>
        <div className="button-group">
          <button className="btn primary" onClick={() => navigate("/register")}>Get Started</button>
          <button className="btn outline" onClick={() => navigate("/login")}>Login</button>
        </div>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <div className="feature-card" key={index}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;//exports the Homepage component so that other files can import and use it.

