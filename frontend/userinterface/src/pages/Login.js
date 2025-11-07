import React, { useState } from "react";//{ useState } is a hook that lets you create state variables in your component.
import axios from "axios";//Imports Axios, a library for making HTTP requests (like talking to your backend).
import { useNavigate, Link } from "react-router-dom";//Imports a hook from React Router.useNavigate is used for programmatic navigation (like redirecting a user after login).
import './Login.css';

const Login = () => {//defining a functional React component called Login.

  const [email, setEmail] = useState("");// State Variable.email and password hold form input values.
  const [password, setPassword] = useState("");// State Variable
  const [error, setError] = useState(null);// State Variable. error holds any login error messages (like "Invalid credentials").
  const navigate = useNavigate();//Navigation Hook. Allows you to programmatically change pages — useful after login success.

  const handleSubmit = async (e) => {// we use "async" because we're using "await axios.post(...)" ........await pauses the function until that axios request finishes. You can only use await inside an async function. JavaScript won't let you otherwise. That's an asynchronous operation — meaning: It takes time (waiting for the server),, We don't know when it will finish,, JavaScript won't wait unless you tell it to
    //Declares an async function to handle login.
    e.preventDefault();//Prevents default form behavior (so the page doesn't reload).Because am using a button and I DONT WANT MY PAGE TO GET REFRESHED 

    try {
      const response = await axios.post("http://localhost:5000/api/auth", { email, password });
      console.log("Login response data:", response.data);
      
      const { token, role, userId, name} = response.data;

      // Store token in sessionStorage or sessionStorage
      sessionStorage.setItem("token", token);//Stores the token in the browser's sessionStorage (so the user stays logged in).
      sessionStorage.setItem("name", name);
      sessionStorage.setItem("role", role);
      //sessionStorage.setItem("email", email); 
      //sessionStorage.setItem("userId", userId); 
      sessionStorage.setItem("userId", response.data.userId);
      sessionStorage.setItem("locationId", response.data.locationId);
      //sessionStorage.setItem("country", response.data.country);//this is used in CategoryPage to filter products by country but in other places I have stored country in JwT
      sessionStorage.setItem("currencyCode", response.data.currency_code);
      //sessionStorage.setItem("country", country); 

      //console.log("UserID from sessionStorage:", userId);


      // Redirect based on role
      if (role === "owner") {
        navigate("/owner-dashboard");
      } else {
        navigate("/customer-dashboard"); 
      }      
    } catch (err) {
      setError("Invalid credentials");//If login fails (e.g., wrong password), set an error message to display.
    }
  };

  return (//Rendered UI
    <div className="login-container">
      <div className="login-card">
      <h2 className="login-title">Login</h2>
      {error && <p className="login-error">{error}</p>}  {/* If there's an error, show it as a <p>. */}
      <form className="login-form" onSubmit={handleSubmit}>
        {/* Wraps inputs in a form and links it to handleSubmit*/}
        <input
          className="login-input"
          type="email"
          placeholder="Email adress..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}//onChange updates the state every time the user types.
        />
        <input
          className="login-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button  className="login-button" type="submit">Login</button>
      </form>
      <div className="login-footer">
          <p>Don't have an account? <Link to="/register" className="register-link">Register here</Link></p>
        </div>
    </div>
  </div>
  );
};

export default Login; //Exports the component so it can be used in other files (like in routing).
