import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Question from "./pages/Question";
import { getToken } from "./auth";
import Dashboard from "./pages/Dashboard";
import MockHR from "./pages/MockHR";
import MockCompany from "./pages/MockCompany";
import Resume from "./pages/Resume";
import History from "./pages/History";
import AddQuestion from "./pages/AddQuestion";

function ProtectedRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/question/:id"
          element={
            <ProtectedRoute>
              <Question />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mock/hr"
          element={
            <ProtectedRoute>
              <MockHR />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mock/company"
          element={
            <ProtectedRoute>
              <MockCompany />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <Resume />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-question"
          element={
            <ProtectedRoute>
              <AddQuestion />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;