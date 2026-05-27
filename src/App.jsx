import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Home from './pages/Home';
import Settings from './pages/Settings';

import Intake from './pages/agent/Intake';
import Patients from './pages/agent/Patients';

import Queue from './pages/mo/Queue';
import CaseReview from './pages/mo/CaseReview';
import MOAppointments from './pages/mo/Appointments';

import PatientAppointments from './pages/patient/Appointments';
import PatientCases from './pages/patient/Cases';

import Metrics from './pages/admin/Metrics';
import Users from './pages/admin/Users';
import Audit from './pages/admin/Audit';

const wrap = (el) => (
  <ProtectedRoute>
    <Layout>{el}</Layout>
  </ProtectedRoute>
);

const wrapRole = (roles, el) => (
  <ProtectedRoute roles={roles}>
    <Layout>{el}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={wrap(<Home />)} />
          <Route path="/settings" element={wrap(<Settings />)} />

          <Route path="/agent" element={wrapRole(['agent', 'admin'], <Intake />)} />
          <Route path="/agent/patients" element={wrapRole(['agent', 'admin'], <Patients />)} />

          <Route path="/mo" element={wrapRole(['mo', 'admin'], <Queue />)} />
          <Route path="/mo/appointments" element={wrapRole(['mo', 'admin'], <MOAppointments />)} />
          <Route path="/mo/case/:id" element={wrapRole(['mo', 'admin'], <CaseReview />)} />

          <Route path="/patient" element={wrapRole(['patient'], <PatientAppointments />)} />
          <Route path="/patient/cases" element={wrapRole(['patient'], <PatientCases />)} />

          <Route path="/admin" element={wrapRole(['admin'], <Metrics />)} />
          <Route path="/admin/users" element={wrapRole(['admin'], <Users />)} />
          <Route path="/admin/audit" element={wrapRole(['admin'], <Audit />)} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
