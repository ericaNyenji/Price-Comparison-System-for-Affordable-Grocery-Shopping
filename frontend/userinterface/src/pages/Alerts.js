import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './Alerts.css';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  //The frontend components connect to Socket.IO and handle real-time events:
  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    const userType = sessionStorage.getItem('userType') || 'customer';
    if (!userId) return;

    // Initialize socket connection
    const socket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userId }
    });

    // Set up socket event listeners
    socket.on('connect', () => {
      console.log('Socket connected, joining room:', userId);
      socket.emit('join', `user_${userId}`);//We want to verify the user's identity before allowing them to join a room
      //we need to know which users are in which rooms to send them specific messages
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('newAlert', (alert) => {
      console.log('New alert received:', alert);
      // Create a unique key for the alert
      const alertKey = `${alert.message}-${alert.timestamp}`;
      
      setAlerts(prevAlerts => {
        // Check if alert already exists
        const isDuplicate = prevAlerts.some(
          existingAlert => 
            `${existingAlert.message}-${existingAlert.timestamp}` === alertKey
        );
        
        if (!isDuplicate) {
          return [{ ...alert, alertKey }, ...prevAlerts];
        }
        return prevAlerts;
      });
    });

    // Fetch existing alerts
    const fetchAlerts = async () => {
      try {
        console.log('Fetching alerts for user:', userId);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/alerts/${userId}?userType=${userType}`);
        console.log('Alerts response:', response.data);
        setAlerts(response.data || []);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    return () => {
      console.log('Cleaning up socket connection');
      socket.off('newAlert');
      socket.off('connect');
      socket.off('connect_error');
      socket.close();
    };
  }, []);

  const handleMarkAsRead = async (alertId) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/alerts/${alertId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        // Update the alerts state to mark this alert as read
        setAlerts(prevAlerts =>
          prevAlerts.map(alert =>
            alert.alert_id === alertId
              ? { ...alert, read_at: new Date().toISOString() }
              : alert
          )
        );
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
      if (error.response?.status === 401) {
        // Token expired, redirect to login
        sessionStorage.clear();
        window.location.href = '/login';
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading alerts...</div>;
  }

  return (
    <div className="alerts-container">
      <h2>Your Alerts</h2>
      {alerts && alerts.length > 0 ? (
        <div className="alerts-list">
          {alerts.map((alert) => (
            <div
              key={alert.alertKey || alert.alert_id}
              className={`alert-card ${!alert.read_at ? 'unread' : 'read'}`}
              onClick={() => !alert.read_at && handleMarkAsRead(alert.alert_id)}
            >
              <div className="alert-content">
                <p className="alert-message">{alert.message}</p>
                <span className="alert-time">
                  {new Date(alert.timestamp || alert.created_at).toLocaleString()}
                </span>
                {alert.type === 'price_change' && (
                  <div className="price-drop-info">
                    <span className="price-drop-icon">💰</span>
                    <span className="price-drop-text">Price Drop!</span>
                  </div>
                )}
              </div>
              {alert.type === 'price_change' && (
                <div className="alert-icon">💰</div>
              )}
              {alert.type === 'deal_expiration' && (
                <div className="alert-icon">⏰</div>
              )}
              {!alert.read_at && (
                <div className="unread-indicator">New</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="no-alerts">No alerts at the moment</p>
      )}
    </div>
  );
};

export default Alerts;
