import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Home from '@/pages/Home';
import VenueDetail from '@/pages/VenueDetail';
import MyBookings from '@/pages/MyBookings';
import OwnerDashboard from '@/pages/owner/OwnerDashboard';
import CreateVenue from '@/pages/owner/CreateVenue';
import OwnerBookings from '@/pages/owner/OwnerBookings';
import AdminDashboard from '@/pages/admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/venues/:id" element={<Layout><VenueDetail /></Layout>} />

          <Route path="/my-bookings" element={
            <ProtectedRoute allowedRoles={['USER']}>
              <Layout><MyBookings /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/owner/dashboard" element={
            <ProtectedRoute allowedRoles={['OWNER']}>
              <Layout><OwnerDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/owner/venues/new" element={
            <ProtectedRoute allowedRoles={['OWNER']}>
              <Layout><CreateVenue /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/owner/bookings" element={
            <ProtectedRoute allowedRoles={['OWNER']}>
              <Layout><OwnerBookings /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;