import React from 'react';
import { Navigate } from 'react-router-dom';
// Dalali new property reuses the existing ListPropertyPage
// Just redirect to avoid duplicating the full wizard
export default function DalaliNewProperty() {
  return <Navigate to="/list-property" replace />;
}
