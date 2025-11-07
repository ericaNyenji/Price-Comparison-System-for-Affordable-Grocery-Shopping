import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

//    ./ means “the current folder” (the folder that this file is in).
//    “Import the file named index.css that’s in the same folder as this file.”
//   ../ means “the parent folder” (the folder that contains the current folder).


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
