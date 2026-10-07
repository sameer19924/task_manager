import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./login/Login";
import Signup from "./signup/Signup";
import List from "./components/List";
import Users from "./users/Users";
import ProtectedRouter from "./ProtectedRouter";
import "./App.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/users"
        element={
          <ProtectedRouter>
            <Users />
          </ProtectedRouter>
        }
      />

      <Route
        path="/list"
        element={
          <ProtectedRouter>
            <List />
          </ProtectedRouter>
        }
      />
    </Routes>
  );
}
