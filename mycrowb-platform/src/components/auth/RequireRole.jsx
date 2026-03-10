import { Navigate } from 'react-router-dom';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (_e) {
    return null;
  }
}

export default function RequireRole({ roles, children }) {
  const token = localStorage.getItem('token');
  const user = readUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
