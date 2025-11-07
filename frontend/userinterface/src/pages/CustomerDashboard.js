import React, { useState, useEffect } from "react";
import axios from "axios";
import './CustomerDashboard.css';
import DealsSection from './DealsSection';
import io from 'socket.io-client';
import SearchSection from '../components/SearchSection';
import ResultsSection from "../components/ResultsSection";
import ExploreSection from '../components/ExploreSection';
import { useNavigate } from 'react-router-dom';

const CustomerDashboard = () => {
  //const navigate = useNavigate(); 
  const name = sessionStorage.getItem("name");
  //const token = sessionStorage.getItem("token");//...retrieving the JWT from sessionStorage here. I can use it to authenticate my /api/search requests by attaching it in the Authorization header like this
  const navigate = useNavigate();
  

  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false); // Loading state to show when search is in progress
  const [exploreData, setExploreData] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]); // List of supermarkets
  const [filterType, setFilterType] = useState("supermarket");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchRadius, setSearchRadius] = useState(5); // Default 5km radius
  const [customerLocation, setCustomerLocation] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  const fetchDeals = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/deals');
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  //We're using useEffect to fetch data when the page first loads and now we added another one to re-run a search when filters change 
  useEffect(() => {
    const fetchData = async () => {
      try {
        const exploreData = await axios.get("http://localhost:5000/api/explore");
        setExploreData(exploreData.data);
        console.log(exploreData)
        const supermarketsResponse = await axios.get("http://localhost:5000/api/supermarkets");
        setSupermarkets(supermarketsResponse.data);
        console.log(supermarketsResponse)
      } catch (err) {
        console.error("Error fetching explore data:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => { if (searchQuery) { handleSearch();}}, 
  [filterType, selectedFilter,searchRadius,useCurrentLocation,customerLocation,searchQuery]);
  
  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
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
      console.log('web Socket connected to Server');
      socket.emit('join', userId);
    });

    // Listen for all price updates
    socket.on('priceUpdated', (updatedProduct) => {
      console.log('Price update received:', updatedProduct);
      setItems(prevItems => 
        prevItems.map(item => 
          item.product_id === updatedProduct.product_id && 
          item.location_id === updatedProduct.location_id
            ? { ...item, price: updatedProduct.price, on_deal: updatedProduct.on_deal }
            : item
        )
      );
    });

    // Listen for price drops specifically
    socket.on('priceDropped', (priceDropData) => {
      console.log('Price drop received:', priceDropData);
      // Update the price in the UI
      setItems(prevItems => 
        prevItems.map(item => 
          item.product_id === priceDropData.product_id && 
          item.location_id === priceDropData.location_id
            ? { ...item, price: priceDropData.price, on_deal: priceDropData.on_deal }
            : item
        )
      );
    });

    // Listen for new alerts
    socket.on('newAlert', (alert) => {
      console.log('New alert received:', alert);
      // Show alert to user
      window.alert(alert.message);
    });

    // Listen for product deletion events
    socket.on('productDeleted', ({ productId, locationId }) => {
      console.log('Product removed from location event received:', { productId, locationId });
      // Remove the product from search results if it's from the current location
      setItems(prevItems => 
        prevItems.filter(item => !(item.product_id === productId && item.location_id === locationId))
      );
    });

    // Fetch initial data
    fetchDeals();

    return () => {
      socket.off('priceUpdated');
      socket.off('priceDropped');
      socket.off('newAlert');
      socket.off('productDeleted');
      socket.off('connect');
      socket.disconnect();
    };
  }, []);
  
//   const handleSearchNoFilter = async () => {
//     setLoading(true);
//     try {
//       let url = `http://localhost:5000/api/search?query=${searchQuery}`;
//       const response = await axios.get(url);
//       setItems(response.data.data || []);
//     }
//    catch (error) {
//     console.error("Search error:", error);
//     setItems([]);
//   } finally {
//     setLoading(false);
//   }
// };
const handleSearchNoFilter = async () => {
  setLoading(true);
  try {
    const token = sessionStorage.getItem("token");

    let url = `http://localhost:5000/api/search?query=${searchQuery}`;

    // Authorization header here too
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,//attaching the JWT
      },
    });

    setItems(response.data.data || []);
  } catch (error) {
    console.error("Search error:", error);
    setItems([]);
  } finally {
    setLoading(false);
  }
};

const handleSearch = async () => {
  setLoading(true);
  try {
    const token = sessionStorage.getItem("token"); // get JWT

    let url = `http://localhost:5000/api/search?query=${searchQuery}`;

    if (selectedFilter) {
      const selectedSupermarket = supermarkets.find(s => s.supermarket_name === selectedFilter);
      if (selectedSupermarket) {
        url += `&supermarketType=${selectedSupermarket.supermarket_id}`;
      }
    }

    if (customerLocation) {
      url += `&lat=${customerLocation.lat}&lng=${customerLocation.lng}&radius=${searchRadius}`;
    }

    // Authorization header here
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,//attaching the JWT
      },
    });

    setItems(response.data.data || []);
  } catch (error) {
    console.error("Search error:", error);
    setItems([]);
  } finally {
    setLoading(false);
  }
};

// //  // Handle search every time the search query changes
//   const handleSearch = async () => {
//     setLoading(true);
//     try {
//       let url = `http://localhost:5000/api/search?query=${searchQuery}`;
      
//       // Add filter parameters if selected
//       if (selectedFilter) {
//         // Find the selected supermarket from the supermarkets array
//         const selectedSupermarket = supermarkets.find(s => s.supermarket_name === selectedFilter);
//         if (selectedSupermarket) {
//           url += `&supermarketType=${selectedSupermarket.supermarket_id}`;
//         }
//       }

//       // Add location-based search parameters if customer location is set
//       if (customerLocation) {
//         url += `&lat=${customerLocation.lat}&lng=${customerLocation.lng}&radius=${searchRadius}`;
//       }

//       const response = await axios.get(url);
//       setItems(response.data.data || []);
//     } catch (error) {
//       console.error("Search error:", error);
//       setItems([]);
//     } finally {
//       setLoading(false);
//     }
//   };

  const handleSearchChange = (e) => { setSearchQuery(e.target.value);};

  useEffect(() => { if (searchQuery !== "") {handleSearch();}}, [searchQuery]);

  const handleFilterTypeChange = (e) => {setFilterType(e.target.value); setSelectedFilter("");};
  const handleFilterChange = (e) => {setSelectedFilter(e.target.value);};
  


  const handleSetLocation = () => {setIsSettingLocation(true); setShowMap(true);};

  const handleLocationSelect = (location) => {
    setCustomerLocation(location);
    setIsSettingLocation(false);
    // Automatically trigger search with the new location
    handleSearch();
  };

  const handleUseCurrentLocation = async () => {
    setShowMap(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setCustomerLocation(location);
            setUseCurrentLocation(true);
            //setShowMap(false);
            handleSearch();//to immediately search after setting location
          },
          (error) => {
            console.error("Error getting location:", error);
          }
        );
      }
    } catch (error) {
      console.error("Error accessing geolocation:", error);
    }
  };

  return (
    <div className="dashboard-container">     
      <header className="dashboard-hero">
        <h1>Hello {name}, Welcome to Your Dashboard!</h1>
        <p>Here you can search for grocery items and compare prices across multiple supermarkets.</p>
        <h2>Search for Grocery Items</h2>
      </header>

      <div className="main-content">
        <SearchSection
        searchQuery={searchQuery}
        handleSearchChange={handleSearchChange}
        showMap={showMap}
        setShowMap={setShowMap}
        handleSetLocation={handleSetLocation}
        handleUseCurrentLocation={handleUseCurrentLocation}
        customerLocation={customerLocation}
        searchRadius={searchRadius}
        setSearchRadius={setSearchRadius}
        filterType={filterType}
        handleFilterTypeChange={handleFilterTypeChange}
        selectedFilter={selectedFilter}
        handleFilterChange={handleFilterChange}
        supermarkets={supermarkets}
        loading={loading}
        handleLocationSelect={handleLocationSelect}
        handleSearchNoFilter={handleSearchNoFilter}
      />

      <ResultsSection items={items} loading={loading} searchQuery={searchQuery} />
      </div>
      
      <ExploreSection exploreData={exploreData} />       
       <DealsSection />    
    </div>
  );
};


export default CustomerDashboard;




