// src/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRouter({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}
