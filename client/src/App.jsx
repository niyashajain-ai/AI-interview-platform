import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./theme.css";
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
import Layout from "./components/Layout";

function Protected({ children }) {
  return getToken() ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/question/:id" element={<Protected><Question /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/mock/hr" element={<Protected><MockHR /></Protected>} />
        <Route path="/mock/company" element={<Protected><MockCompany /></Protected>} />
        <Route path="/resume" element={<Protected><Resume /></Protected>} />
        <Route path="/history" element={<Protected><History /></Protected>} />
        <Route path="/add-question" element={<Protected><AddQuestion /></Protected>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;