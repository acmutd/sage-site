import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";

const App = () => {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
    </div>
  );
};

export default App;
