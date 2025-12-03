import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./routes/Dashboard";
import Products from "./routes/Products";
import ProductDetail from "./routes/ProductDetail";
import Locations from "./routes/Locations";
import Adjustments from "./routes/Adjustments";
import HusseSync from "./routes/HusseSync";
import Settings from "./routes/Settings";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/adjustments" element={<Adjustments />} />
        <Route path="/husse" element={<HusseSync />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;
