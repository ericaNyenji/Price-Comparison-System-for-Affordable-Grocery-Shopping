import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom store icon
const storeIcon = L.divIcon({
  className: 'store-marker',
  html: '<div style="background-color: #e74c3c; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;"><span style="color: white; font-size: 16px;">🏪</span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Create custom selected location icon
const selectedLocationIcon = L.divIcon({
  className: 'selected-marker',
  html: '<div style="background-color: #4CAF50; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;"><span style="color: white; font-size: 16px;">📍</span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const LocationMarker = ({ position, setPosition, existingLocations }) => {
  useMapEvents({
    click(e) {
      // Check if clicked location is too close to existing locations
      const isTooClose = existingLocations.some(loc => {
        const distance = L.latLng(loc.latitude, loc.longitude).distanceTo(e.latlng);
        return distance < 100; // 100 meters minimum distance
      });

      if (isTooClose) {
        alert('This location is too close to an existing supermarket. Please choose another location.');
        return;
      }
      setPosition(e.latlng);
    },
  });

  return (
    <>
      {existingLocations.map((location, index) => (
        <Marker
          key={index}
          position={[location.latitude, location.longitude]}
          icon={storeIcon}
        />
      ))}
      {position && (
        <Marker
          position={position}
          icon={selectedLocationIcon}
        />
      )}
    </>
  );
};

const SupermarketLocationPicker = ({ onLocationSelect, onSupermarketSelect, onNameChange, showAllSupermarkets = false }) => {
  const [position, setPosition] = useState(null);
  const [supermarkets, setSupermarkets] = useState([]);
  const [supermarketLocations, setSupermarketLocations] = useState([]);
  const [selectedSupermarket, setSelectedSupermarket] = useState("");
  const [supermarketName, setSupermarketName] = useState("");
  const [newSupermarketName, setNewSupermarketName] = useState('');
  const [showNewSupermarketInput, setShowNewSupermarketInput] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    fetchData();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  };

  const fetchData = async () => {
    try {
      const [supermarketsRes, locationsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/supermarkets`),
        axios.get(`${process.env.REACT_APP_API_URL}/api/supermarket_locations`)
      ]);
      
      setSupermarkets(supermarketsRes.data);
      setSupermarketLocations(locationsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handlePositionChange = (newPosition) => {
    setPosition(newPosition);
    if (onLocationSelect) {
      onLocationSelect(newPosition);
    }
  };

  const handleAddNewSupermarket = async () => {
    if (newSupermarketName.trim()) {
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/supermarkets`, {
          supermarket_name: newSupermarketName.trim()
        });
        setSupermarkets([...supermarkets, response.data]);
        setShowNewSupermarketInput(false);
        setNewSupermarketName('');
      } catch (error) {
        console.error('Error adding new supermarket:', error);
      }
    }
  };

  const createSupermarketMarker = (location) => {
    return L.divIcon({
      className: 'store-marker',
      html: `
        <div style="position: relative;">
          <div style="
            position: absolute;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 2px 6px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            white-space: nowrap;
            font-size: 12px;
            font-weight: bold;
            color: #333;
            z-index: 1000;
          ">
            ${location.location_name}
          </div>
          <div style="
            background-color: #e74c3c;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  return (
    <div className="supermarket-location-picker">
      <div className="map-container">
        <MapContainer
          center={userLocation || [47.4979, 19.0402]}
          zoom={13}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Show user's current location */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: 'user-marker',
                html: `
                  <div style="position: relative;">
                    <div style="
                      background-color: #1976d2;
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      border: 2px solid white;
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    "></div>
                  </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
            />
          )}
          
          {/* Show all supermarket locations - always show labels */}
          {supermarketLocations.map((location) => (
            <Marker
              key={location.location_id}
              position={[location.latitude, location.longitude]}
              icon={createSupermarketMarker(location)}
            />
          ))}

          {/* Show selected position marker */}
          {position && (
            <Marker
              position={[position.lat, position.lng]}
              icon={L.divIcon({
                className: 'selected-marker',
                html: `
                  <div style="position: relative;">
                    <div style="
                      position: absolute;
                      bottom: 25px;
                      left: 50%;
                      transform: translateX(-50%);
                      background: white;
                      padding: 2px 6px;
                      border-radius: 4px;
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                      white-space: nowrap;
                      font-size: 12px;
                      font-weight: bold;
                      color: #333;
                      z-index: 1000;
                    ">
                      Selected Location
                    </div>
                    <div style="
                      background-color: #4CAF50;
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      border: 2px solid white;
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    "></div>
                  </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
            />
          )}

          <LocationMarker
            position={position}
            setPosition={handlePositionChange}
            existingLocations={supermarketLocations}
          />
        </MapContainer>
      </div>

      {/* Only show supermarket form if not in showAllSupermarkets mode */}
      {!showAllSupermarkets && (
        <div className="supermarket-form">
          <div className="form-group">
            <label>Supermarket Name:</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => {
                setLocationName(e.target.value);
                onNameChange(e.target.value);
              }}
              placeholder="Enter supermarket name"
            />
          </div>

          <div className="form-group">
            <label>Supermarket Type:</label>
            <select onChange={(e) => onSupermarketSelect(e.target.value)}>
              <option value="">Select supermarket type</option>
              {supermarkets.map((supermarket) => (
                <option key={supermarket.supermarket_id} value={supermarket.supermarket_id}>
                  {supermarket.supermarket_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewSupermarketInput(!showNewSupermarketInput)}
            >
              {showNewSupermarketInput ? 'Cancel' : 'Add New Type'}
            </button>
          </div>

          {showNewSupermarketInput && (
            <div className="form-group">
              <input
                type="text"
                value={newSupermarketName}
                onChange={(e) => setNewSupermarketName(e.target.value)}
                placeholder="Enter new supermarket type"
              />
              <button type="button" onClick={handleAddNewSupermarket}>
                Add
              </button>
            </div>
          )}

          {position && (
            <div className="coordinates">
              <p>Selected Location:</p>
              <p>Latitude: {position.lat.toFixed(6)}</p>
              <p>Longitude: {position.lng.toFixed(6)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupermarketLocationPicker; 
