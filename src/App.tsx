import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./routes/Dashboard";
import Products from "./routes/Products";
import ProductDetail from "./routes/ProductDetail";
import Locations from "./routes/Locations";
import Movements from "./routes/Movements";
import Adjustments from "./routes/Adjustments";
import Settings from "./routes/Settings";
import Sandbox from "./routes/Sandbox";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/documents" element={<Adjustments />} />
        <Route path="/adjustments" element={<Navigate to="/documents" replace />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/sandbox" element={<Sandbox />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;
