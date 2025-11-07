import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ExploreSection.css';

const ExploreSection = ({ exploreData }) => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId) => {
    navigate(`/category/${categoryId}`);
  };

  return (
    <section className="explore-section">
      <h2>Explore Categories</h2>
      <div className="explore-icons-grid">
        {exploreData.map((category, idx) => (
          <div
            key={idx}
            className="explore-category-icon"
            onClick={() => handleCategoryClick(category.category_id)}
          >
            <img
              src={`/images/categories/${category.category_name.toLowerCase()}.jpg`}
              alt={category.category_name}
            />
            <p>{category.category_name}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExploreSection;
