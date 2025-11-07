import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  
import axios from 'axios';
import io from 'socket.io-client';
import { formatCurrency } from "../utils/currency";
import './Favorites.css';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = sessionStorage.getItem('userId');
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userId }
    });

    newSocket.on('connect', () => {
      newSocket.emit('authenticate', { userId });
    });

    newSocket.on('priceUpdated', (updatedPrice) => {
      setFavorites(prev =>
        prev.map(fav =>
          fav.product_id === updatedPrice.product_id &&
          fav.price_id === updatedPrice.price_id
            ? { ...fav, price: updatedPrice.price }
            : fav
        )
      );
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('priceUpdated');
      newSocket.close();
    };
  }, [userId]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!userId) {
        setError('Please log in to view your favorites');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/favorites/user/${userId}`);
        const favoriteProducts = await Promise.all(
          response.data.data.map(async (favorite) => {
            try {
              const productResponse = await axios.get(
                `http://localhost:5000/api/products/details/${favorite.product_id}`
              );
              const product = productResponse.data.product;

              const favoritedPrice = product.prices.find(p => p.price_id === favorite.price_id);
              if (favoritedPrice) {
                return {
                  ...product,
                  price_id: favoritedPrice.price_id,
                  price: favoritedPrice.price,
                  on_deal: favoritedPrice.on_deal,
                  deal_price: favoritedPrice.deal_price,
                  supermarket_name: favoritedPrice.supermarket_name,
                  supermarket_image: favoritedPrice.supermarket_image,
                  location_name: favoritedPrice.location_name,
                  location_id: favoritedPrice.location_id,
                };
              }
              return null;
            } catch (err) {
              console.error(`Error fetching product ${favorite.product_id}:`, err);
              return null;
            }
          })
        );

        setFavorites(favoriteProducts.filter(product => product !== null));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching favorites:', err);
        setError('Failed to load favorites');
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [userId]);

  const toggleFavorite = async (productId, priceId) => {
    try {
      await axios.delete(`http://localhost:5000/api/favorites/${productId}?userId=${userId}&priceId=${priceId}`);
      setFavorites(favorites.filter(fav => !(fav.product_id === productId && fav.price_id === priceId)));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  if (loading) return <div className="loading">Loading favorites...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!userId) return <div className="error">Please log in to view your favorites</div>;

  return (
    <div className="favorites-container">
      <h1>My Favorites</h1>

      {favorites.length === 0 ? (
        <p className="no-favorites">You don't have any favorites yet.</p>
      ) : (
        <div className="favorites-grid">
          {favorites.map((favorite) => (
            <div
              key={`${favorite.product_id}-${favorite.price_id}`}
              className="favorite-card"
              onClick={() =>
                navigate(`/review/${favorite.product_id}/location/${favorite.location_id}/price/${favorite.price}`)
              }
            >
              <div className="favorite-image-container">
                <img
                  src={`http://localhost:5000/${favorite.image_path}`}
                  alt={favorite.product_name}
                  className="favorite-image"
                />
              </div>

              <div className="favorite-details">
                <h3>{favorite.product_name}</h3>
                <div className="price-info">
                  <p className="supermarket-name">🏬 {favorite.supermarket_name}</p>
                  <p className="location">📍 {favorite.location_name}</p>
                  <p className="price">{formatCurrency(Number(favorite.price).toFixed(2))}</p>
                  
                  <div className="supermarket">
                    <img
                      src={`http://localhost:5000/${favorite.supermarket_image}`}
                      alt={favorite.supermarket_name}
                      className="supermarket-logo"
                    />
                  </div>
                  {favorite.on_deal && (
                    <span className="deal-badge">On Deal!</span>
                  )}
                </div>
              </div>

              <div
                className="favorite-button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(favorite.product_id, favorite.price_id);
                }}
              >
                <div className="heart-icon favorited">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                      2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                      C13.09 3.81 14.76 3 16.5 3
                      19.58 3 22 5.42 22 8.5
                      c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill="#e74c3c"
                      stroke="#e74c3c"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
