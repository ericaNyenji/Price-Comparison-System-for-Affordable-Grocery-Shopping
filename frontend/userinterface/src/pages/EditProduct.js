import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import io from 'socket.io-client';
import './EditProduct.css';

const EditProduct = () => {
  const { product_id } = useParams();
  const navigate = useNavigate();
  const location_id = sessionStorage.getItem("locationId");
  
  const [product, setProduct] = useState({
    name: "",
    price: "",
    imagePath: "",
    onDeal: false,
    currentDeal: null
  });
  
  const [dealForm, setDealForm] = useState({
    percentageDiscount: "",
    startDateTime: "",
    endDateTime: ""
  });

  const [priceSubmissions, setPriceSubmissions] = useState([]);

  // Fetch product info and price submissions
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [productRes, submissionsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/products/${product_id}?locationId=${location_id}`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/price-submissions/pending/${location_id}`, {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          })
        ]);

        const { product_name, price, image_path, on_deal, deal } = productRes.data.data;
        setProduct({
          name: product_name,
          price: price,
          imagePath: image_path,
          onDeal: on_deal,
          currentDeal: deal || null
        });

        // Filter submissions for this product
        const productSubmissions = submissionsRes.data.filter(
          sub => sub.product_id === parseInt(product_id)
        );
        
        // Format submissions with all necessary information
        const formattedSubmissions = productSubmissions.map(sub => ({
          submission: {
            ...sub,
            submission_id: sub.submission_id,
            customer_name: sub.customer_name,
            current_price: sub.current_price,
            new_price: sub.new_price,
            evidence_url: sub.evidence_url,
            product_id: sub.product_id
          },
          message: `New price submission from ${sub.customer_name}`
        }));

        setPriceSubmissions(formattedSubmissions);
      } catch (error) {
        console.error("Error fetching details:", error);
      }
    };

    fetchDetails();
  }, [product_id, location_id]);

  // Initialize socket connection
  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    const newSocket = io(`${process.env.REACT_APP_API_URL}`, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userId }
    });
    
    newSocket.on('connect', () => {
      newSocket.emit('authenticate', { userId });
      newSocket.emit('joinOwnerRoom', location_id);
    });

    newSocket.on('newPriceSubmission', (data) => {
      if (data.submission.product_id === parseInt(product_id)) {
        // Check if this submission is already in the list
        setPriceSubmissions(prev => {
          const exists = prev.some(sub => 
            sub.submission.submission_id === data.submission.submission_id
          );
          if (!exists) {
            return [...prev, data];
          }
          return prev;
        });
      }
    });

    newSocket.on('newDeal', (deal) => {
      if (deal.product_id === parseInt(product_id) && deal.location_id === parseInt(location_id)) {
        setProduct(prev => ({ ...prev, onDeal: true, currentDeal: deal }));
      }
    });

    newSocket.on('dealUpdated', (updatedDeal) => {
      if (updatedDeal.product_id === parseInt(product_id) && updatedDeal.location_id === parseInt(location_id)) {
        setProduct(prev => ({ ...prev, currentDeal: updatedDeal }));
      }
    });

    newSocket.on('dealRemoved', (data) => {
      if (data.productId === parseInt(product_id) && data.locationId === parseInt(location_id)) {
        setProduct(prev => ({ ...prev, onDeal: false, currentDeal: null }));
      }
    });

     () => {
      newSocket.close();
    };
  }, [product_id, location_id]);

  const handleApproveSubmission = async (submissionId) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/price-submissions/approve/${submissionId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Find the approved submission to get the new price
      const approvedSubmission = priceSubmissions.find(
        sub => sub.submission.submission_id === submissionId
      );

      if (approvedSubmission) {
        // Update the product's price in the state
        setProduct(prev => ({
          ...prev,
          price: approvedSubmission.submission.new_price
        }));

        // Automatically update the price in the database
        try {
          await axios.put(`${process.env.REACT_APP_API_URL}/api/products/${product_id}`, {
            price: approvedSubmission.submission.new_price,
            locationId: location_id
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          console.error("Error updating product price:", error);
          alert("Price submission approved but failed to update product price");
          return;
        }
      }

      // Remove the approved submission from the list
      setPriceSubmissions(prev => prev.filter(sub => sub.submission.submission_id !== submissionId));
      alert("Price submission approved and product price updated successfully!");
    } catch (error) {
      console.error("Error approving submission:", error);
      alert("Failed to approve submission.");
    }
  };

  const handleRejectSubmission = async (submissionId) => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/price-submissions/reject/${submissionId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPriceSubmissions(prev => prev.filter(sub => sub.submission.submission_id !== submissionId));
      alert("Price submission rejected successfully!");
    } catch (error) {
      console.error("Error rejecting submission:", error);
      alert("Failed to reject submission.");
    }
  };

  const handlePriceUpdate = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/products/${product_id}`, {
        price: product.price,
        locationId: location_id
      });
      alert(" Price updated!");
    } catch (error) {
      console.error("Error updating price:", error);
      alert(" Failed to update price");
    }
  };

  const handleDealSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!dealForm.endDateTime) {
        alert('Please set the end time for the deal');
        return;
      }

      // Set start time to current time
      const currentDateTime = new Date().toISOString().slice(0, 16);

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/deals`, {
        productId: product_id,
        dealStartDate: currentDateTime,
        dealEndDate: dealForm.endDateTime,
        locationId: location_id,
        PercentageDiscount: dealForm.percentageDiscount
      });
      
      if (response.data.success) {
        setProduct(prev => ({ ...prev, onDeal: true }));
        alert('Deal added successfully!');
      }
    } catch (error) {
      console.error('Error adding deal:', error);
      alert('Failed to add deal. Please try again.');
    }
  };

  const handleDealUpdate = async (e) => {
    e.preventDefault();
    try {
      if (!dealForm.endDateTime) {
        alert('Please set the end time for the deal');
        return;
      }

      // Set start time to current time
      const currentDateTime = new Date().toISOString().slice(0, 16);

      const response = await axios.put(`${process.env.REACT_APP_API_URL}/api/deals/${product_id}`, {
        dealStartDate: currentDateTime,
        dealEndDate: dealForm.endDateTime,
        locationId: location_id,
        PercentageDiscount: dealForm.percentageDiscount
      });
      
      if (response.data.success) {
        alert('Deal updated successfully!');
      }
    } catch (error) {
      console.error('Error updating deal:', error);
      alert('Failed to update deal. Please try again.');
    }
  };

  const handleDealRemove = async () => {
    const confirm = window.confirm("Are you sure you want to remove this deal?");
    if (!confirm) return;
    
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/deals/${product_id}?locationId=${location_id}`);
      setProduct(prev => ({ ...prev, onDeal: false, currentDeal: null }));
      alert("❌ Deal removed.");
    } catch (error) {
      console.error("Error removing deal:", error);
      alert("❌ Failed to remove deal");
    }
  };

  return (
    <div className="edit-product-container">
      <img
        src={`${process.env.REACT_APP_API_URL}/${product.image_path}`} 
        alt={product.name} 
        className="product-image" 
        style={{
          maxWidth: '200px',
          height: 'auto',
          objectFit: 'contain',
          marginBottom: '20px'
        }}
      />
      <h2>Edit Product No. {product_id}</h2>
      <div>
        <strong style={{ color: 'green' }}>
          Current Price: {product.price}
        </strong>
      </div>
      <input 
        type="number" 
        value={product.price} 
        onChange={(e) => setProduct(prev => ({ ...prev, price: e.target.value }))} 
        placeholder="New Price"
      />
      <button onClick={handlePriceUpdate}>Update Price</button>

      {/* Price Submissions Section */}
      {priceSubmissions.length > 0 && (
        <div className="price-submissions-section">
          <h3>Pending Price Submissions</h3>
          <div className="submissions-list">
            {priceSubmissions.map((submission, index) => (
              <div key={index} className="submission-card">
                <p>From: {submission.submission.customer_name}</p>
                <p>Current Price: ${submission.submission.current_price}</p>
                <p>Proposed Price: ${submission.submission.new_price}</p>

                {submission.submission.evidence_image && submission.submission.evidence_image !== "null" && (
                <img
                  src={`${process.env.REACT_APP_API_URL}/${submission.submission.evidence_image}`}
                  alt="Evidence"
                  style={{ width: "120px", borderRadius: "8px", marginTop: "8px", objectFit: "cover" }}
                />
              )}


                {submission.submission.evidence_url && (
                  <p>
                    <a href={submission.submission.evidence_url} target="_blank" rel="noopener noreferrer">
                      View Evidence
                    </a>
                  </p>
                )}
                <div className="submission-actions">
                  <button onClick={() => handleApproveSubmission(submission.submission.submission_id)}>
                    Approve
                  </button>
                  <button onClick={() => handleRejectSubmission(submission.submission.submission_id)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr />

      <h3>Deal Offer</h3>
      
      {product.onDeal ? (
        <div className="deal-form">
          {/*<h3>Update Deal</h3>*/}
          <input
            type="number"
            placeholder="Discount Percentage"
            value={dealForm.percentageDiscount}
            onChange={(e) => setDealForm(prev => ({ ...prev, percentageDiscount: e.target.value }))}
            required
          />
          <div className="time-input-group">
            <label>End Date and Time</label>
            <input
              type="datetime-local"
              value={dealForm.endDateTime}
              onChange={(e) => setDealForm(prev => ({ ...prev, endDateTime: e.target.value }))}
              required
            />
          </div>
          <button onClick={handleDealUpdate}>Update Deal</button>
          <button onClick={handleDealRemove}>Remove Deal</button>
        </div>
      ) : (
        <div className="deal-form">
          <h3>Add New Deal</h3>
          <input
            type="number"
            placeholder="Discount Percentage"
            value={dealForm.percentageDiscount}
            onChange={(e) => setDealForm(prev => ({ ...prev, percentageDiscount: e.target.value }))}
            required
          />
          <div className="time-input-group">
            <label>End Date and Time</label>
            <input
              type="datetime-local"
              value={dealForm.endDateTime}
              onChange={(e) => setDealForm(prev => ({ ...prev, endDateTime: e.target.value }))}
              required
            />
          </div>
          <button onClick={handleDealSubmit}>Add Deal</button>
        </div>
      )}

      <br /><br />
      <button onClick={() => navigate(-1)}>Back</button>
      {/* ⬅ Back */}
    </div>
  );
};

export default EditProduct;
