import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import './Review.css';

const Review = () => {
    const { productId, locationId, price } = useParams();
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [locationName, setLocationName] = useState('');
    const [currentPrice, setCurrentPrice] = useState(null);
    const [newPrice, setNewPrice] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [showPriceUpdateForm, setShowPriceUpdateForm] = useState(false);
    const [priceUpdateSuccess, setPriceUpdateSuccess] = useState(false);
    const [productImage, setProductImage] = useState('');
    const [evidenceImage, setEvidenceImage] = useState(null);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                 // Fetch product details (including image)
            const productResponse = await axios.get(`http://localhost:5000/api/products/details/${productId}`);
            setProductImage( productResponse.data.product.image_path); 
            
                // Fetch reviews
                const reviewsResponse = await axios.get(`http://localhost:5000/api/reviews/product/${productId}/location/${locationId}`);
                setReviews(reviewsResponse.data);
                
                // Fetch current price
                const priceResponse = await axios.get(`http://localhost:5000/api/products/${productId}/locations/${locationId}/price`);
                setCurrentPrice(priceResponse.data.price);
                
                // Fetch location name
                const locationResponse = await axios.get(`http://localhost:5000/api/locations/${locationId}`);
                setLocationName(locationResponse.data.location_name);
                
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load data');
                setLoading(false);
            }
        };

        fetchData();

        // Connect to Socket.IO
        const socket = io('http://localhost:5000');
        
        socket.on('newReview', (newReview) => {
            if (newReview.product_id === parseInt(productId) && newReview.location_id === parseInt(locationId)) {
                setReviews(prevReviews => [newReview, ...prevReviews]);
            }
        });

        socket.on('reviewDeleted', (deletedReviewId) => {
            setReviews(prevReviews => prevReviews.filter(review => review.review_id !== deletedReviewId));
        });

        return () => {
            socket.disconnect();
        };
    }, [productId, locationId]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        
        if (!token) {
            setError('Please log in to leave a review');
            return;
        }

        try {
            await axios.post('http://localhost:5000/api/reviews', {
                product_id: productId,
                location_id: locationId,
                rating,
                comment
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // Refresh reviews
            const response = await axios.get(`http://localhost:5000/api/reviews/product/${productId}/location/${locationId}`);
            setReviews(response.data);
            setComment('');
            setError('');
        } catch (error) {
            console.error('Error submitting review:', error);
            setError('Failed to submit review');
        }
    };

    const handleSubmitPriceUpdate = async (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        
        
        if (!token) {
            setError('Please log in to submit a price update');
            return;
        }

        try {
            // await axios.post('http://localhost:5000/api/price-submissions', {
            //     product_id: productId,
            //     location_id: locationId,
            //     new_price: parseFloat(newPrice),
            //     evidence_url: evidenceUrl
            // }, {
            //     headers: {
            //         Authorization: `Bearer ${token}`
            //     }
            // });

                        const formData = new FormData();
            formData.append('product_id', productId);
            formData.append('location_id', locationId);
            formData.append('new_price', parseFloat(newPrice));
            if (evidenceUrl) formData.append('evidence_url', evidenceUrl);
            if (evidenceImage) formData.append('evidence_image', evidenceImage);

            await axios.post('http://localhost:5000/api/price-submissions', formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
            });


            setPriceUpdateSuccess(true);
            setNewPrice('');
            setEvidenceUrl('');
            setShowPriceUpdateForm(false);
            setTimeout(() => setPriceUpdateSuccess(false), 3000);
        } catch (error) {
            console.error('Error submitting price update:', error);
            setError('Failed to submit price update');
        }
    };

    const handleDelete = async (reviewId) => {
        const token = sessionStorage.getItem('token');
        
        if (!token) {
            setError('Please log in to delete a review');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete review');
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            setError('Failed to delete review');
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="review-container">
            <h1>Reviews</h1>
            
            {productImage && (
            <img 
                src={`http://localhost:5000/${productImage}`} 
                alt="Product" 
                className="product-image"
            />
            )}

            {/* Price Update Section */}
            <div className="price-update-section">
                <h3>Current Price: HUF {price}</h3>
                {!showPriceUpdateForm ? (
                    <button 
                        className="update-price-button"
                        onClick={() => setShowPriceUpdateForm(true)}
                    >
                        Submit Price Update
                    </button>
                ) : (
                    <form onSubmit={handleSubmitPriceUpdate} className="price-update-form">
                        <div className="form-group">
                            <label htmlFor="newPrice">New Price:</label>
                            <input
                                type="number"
                                id="newPrice"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                step="0.01"
                                min="0"
                                required
                            />
                        </div>
                        {/* <div className="form-group">
                            <label htmlFor="evidenceUrl">Evidence URL (optional):</label>
                            <input
                                type="url"
                                id="evidenceUrl"
                                value={evidenceUrl}
                                onChange={(e) => setEvidenceUrl(e.target.value)}
                                placeholder="Link to receipt or photo"
                            />
                        </div> */}
                                                <div className="form-group">
                        <label htmlFor="evidenceImage">Upload Evidence Image (optional):</label>
                        <input
                            type="file"
                            id="evidenceImage"
                            accept="image/*"
                            onChange={(e) => setEvidenceImage(e.target.files[0])}
                        />
                        </div>


                                                <div className="form-group">
                        <label htmlFor="evidenceUrl">Evidence URL (optional):</label>
                        <input
                            type="url"
                            id="evidenceUrl"
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                            placeholder="Link to receipt or photo"
                        />
                        </div>


                        <div className="button-group">
                            <button type="submit" className="submit-button">Submit Update</button>
                            <button 
                                type="button" 
                                className="cancel-button"
                                onClick={() => setShowPriceUpdateForm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
                {priceUpdateSuccess && (
                    <div className="success-message">
                        Price update submitted successfully! Waiting for owner approval.
                    </div>
                )}
            </div>

            {/* Review Form */}
            <form onSubmit={handleSubmitReview} className="review-form">
                <div className="form-group">
                    <label htmlFor="rating">Rating:</label>
                    <select
                        id="rating"
                        value={rating}
                        onChange={(e) => setRating(parseInt(e.target.value))}
                    >
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="comment">Your Review:</label>
                    <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="submit-button">Submit Review</button>
            </form>

            {/* Reviews List */}
            <div className="reviews-list">
                {reviews.map(review => (
                    <div key={review.review_id} className="review-card">
                        <div className="review-header">
                            <span className="reviewer-name">{review.customer_name}</span>
                            <span className="review-rating">⭐ {review.rating}/5</span>
                            <span className="review-date">
                                {new Date(review.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="review-comment">{review.comment}</p>
                        {review.customer_id === parseInt(sessionStorage.getItem('userId')) && (
                            <button
                                onClick={() => handleDelete(review.review_id)}
                                className="delete-button"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Review;
