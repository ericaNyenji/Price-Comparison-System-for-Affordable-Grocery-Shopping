import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { formatCurrency } from "../utils/currency";
import './OwnerCategoryPage.css';

const OwnerCategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const locationId = sessionStorage.getItem("locationId");
  const token = sessionStorage.getItem("token");

  useEffect(() => {
    const socket = io('http://localhost:5000');
      
      socket.on('productDeleted', ({ product_id, location_id }) => {
    console.log("Received productDeleted event:", { product_id, location_id });
    if (location_id === parseInt(locationId)) {
      setProducts(prevProducts =>
        prevProducts.filter(product => product.product_id !== product_id)
      );
    }
  });


    return () => {
      socket.disconnect();
    };
  }, [locationId]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        //const response = await axios.get(`http://localhost:5000/api/productsbycategory/${categoryId}`);
            const response = await axios.get(
      `http://localhost:5000/api/productsbycategory/${categoryId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

        console.log("Category API Response:", response.data);
        const productsWithPrices = await Promise.all(
          (response.data.products || []).map(async (product) => {
            try {
              const priceResponse = await axios.get(`http://localhost:5000/api/products/${product.product_id}?locationId=${locationId}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              return {
                ...product,
                price: priceResponse.data.data.price,
                existsInLocation: true
              };
            } catch (err) {
              if (err.response?.status === 404) {
                // Product doesn't exist in this location
                return null;
              }
              console.error('Error fetching price for product:', product.product_id, err);
              return {
                ...product,
                price: 'N/A',
                existsInLocation: false
              };
            }
          })
        );
        
        // Filter out products that don't exist in this location
        const validProducts = productsWithPrices.filter(product => product !== null && product.existsInLocation);
        
        setProducts(validProducts);
        setCategoryName(response.data.category_name || 'Category');
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch products');
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId, locationId, token]);

  const handleProductClick = (productId) => {
    navigate(`/edit-product/${productId}`);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to remove this product from your location?')) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        // The socket event will handle the UI update
      } catch (err) {
        setError('Failed to remove product from location');
      }
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="owner-category-page">
      <h1>{categoryName}</h1>
      <div className="products-grid">
        {products.length > 0 ? (
          products.map(product => (
            <div 
              key={product.product_id} 
              className="product-card"
              onClick={() => handleProductClick(product.product_id)}
            >
              <img 
                src={`http://localhost:5000/${product.image_path}`}
                alt={product.product_name} 
                className="product-image"
              />
              <div className="product-info">
                <h3>{product.product_name}</h3>
                <p className="price">{formatCurrency(product.price)}</p>
                <button 
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProduct(product.product_id);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-products">No products found in this category for your location</div>
        )}
      </div>
    </div>
  );
};

export default OwnerCategoryPage; 