import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from '@/components/app-layout';
import { RequireAuth, RequireGuest } from '@/components/route-guards';
import { HomePage } from '@/pages/home-page';
import { LoginPage } from '@/pages/login-page';

function App() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
