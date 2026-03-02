import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { auth } from './api';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Printers from './pages/Printers';
import PrinterDetail from './pages/PrinterDetail';
import Consumables from './pages/Consumables';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Warehouse from './pages/Warehouse';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import CreateShipment from './pages/CreateShipment';

const UserContext = createContext(null);

export function useUser() {
  return useContext(UserContext);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    auth.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = (token, u) => {
    localStorage.setItem('token', token);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="badge badge-running">Загрузка...</span>
      </div>
    );
  }

  return (
    <UserContext.Provider value={user}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={login} />} />
        <Route path="/" element={user ? <Layout onLogout={logout} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="printers" element={<Printers />} />
          <Route path="printers/:id" element={<PrinterDetail />} />
          <Route path="consumables" element={<Consumables />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="warehouse" element={<Warehouse />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="shipments/new" element={<CreateShipment />} />
          <Route path="shipments/:id" element={<ShipmentDetail />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </UserContext.Provider>
  );
}
