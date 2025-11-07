// src/components/SearchSection.jsx
import React from 'react';
import SupermarketLocationPicker from './SupermarketLocationPicker';
import Select from 'react-select';
import './SearchSection.css'; 


const SearchSection = ({
  searchQuery,
  handleSearchChange,
  showMap,
  setShowMap,
  handleSetLocation,
  handleUseCurrentLocation,
  customerLocation,
  searchRadius,
  setSearchRadius,
  filterType,
  handleFilterTypeChange,
  selectedFilter,
  handleFilterChange,
  supermarkets,
  loading,
  handleLocationSelect,
  handleSearchNoFilter
}) => {

  // Convert supermarket list into react-select options
  const supermarketOptions = supermarkets.map((supermarket) => ({
    value: supermarket.supermarket_name,
    label: supermarket.supermarket_name,
  }));

    // Shared orange-red styling for both selects
    const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? 'orangered' : '#ccc',
      boxShadow: 'none',
      '&:hover': { borderColor: 'orangered' },
      borderRadius: '6px',
       minHeight: '38px',       // a little taller for text
      height: '32px',             // compact control
      fontSize: '0.85rem',        // smaller text
      padding: '0 2px',           // tighter padding
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 6px',           // less padding inside
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: '32px',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '0 2px',
    }),
    option: (base, { isFocused }) => ({
      ...base,
      fontSize: '0.85rem',
      padding: '6px 10px',
      backgroundColor: isFocused ? 'orangered' : 'white',
      color: isFocused ? 'white' : 'black',
    }),
    menu: (base) => ({
      ...base,
      fontSize: '0.85rem',
    }),
  };
  
  return (
    <section className="search-section">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <div className="location-controls">
        <button onClick={() => setShowMap(!showMap)}>
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>
        <button onClick={handleSetLocation}>
          Set Another Location
        </button>
        <button onClick={handleUseCurrentLocation}>
          Use Current Location
        </button>
        <button onClick={handleSearchNoFilter}>Reset Filters: Get Cheapest Overall</button>
         <div>
            <label>Search Radius (km):</label>
            <input
              type="number"
              value={searchRadius}
              onChange={(e) => setSearchRadius(e.target.value)}
              min="1"
              max="50"
            />
          </div>
      </div>

      {showMap && (
        <SupermarketLocationPicker
          onLocationSelect={handleLocationSelect}
          showAllSupermarkets={true}
        />
      )}

      {/* <div className="filter-controls">
        <select value={filterType} onChange={handleFilterTypeChange}>
          <option value="supermarket">Filter by Supermarket</option>
          <option value="none">No Filter</option>
        </select>

        {filterType === "supermarket" && (
          <select value={selectedFilter} onChange={handleFilterChange}>
            <option value="">Select Supermarket</option>
            {supermarkets.map((supermarket) => (
              <option key={supermarket.supermarket_id} value={supermarket.supermarket_name}>
                {supermarket.supermarket_name}
              </option>
            ))}
          </select>
        )}
      </div> */}
      <div className="filter-controls">
        {/* First dropdown - filter type */}
        <Select
          options={[
            { value: "supermarket", label: "Filter by Supermarket" },
            { value: "none", label: "No Filter" }
          ]}
          value={{ value: filterType, label: filterType === "supermarket" ? "Filter by Supermarket" : "No Filter" }}
          onChange={(selectedOption) => handleFilterTypeChange({ target: { value: selectedOption.value } })}
          styles={selectStyles}
        />

        {/* Second dropdown - select supermarket */}
        {filterType === "supermarket" && (
          <Select
            options={supermarketOptions}
            placeholder="Select Supermarket"
            value={supermarketOptions.find(option => option.value === selectedFilter) || null}
            onChange={(selectedOption) =>
              handleFilterChange({ target: { value: selectedOption ? selectedOption.value : "" } })
            }
            styles={selectStyles}
          />
        )}
      </div>

      {loading && <div className="loading">Loading...</div>}
    </section>
  );
};

export default SearchSection;
