import { UserRole } from '@helpdesk/shared';
import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from '@/modules/layouts/app-layout';
import {
  RequireAuth,
  RequireGuest,
  RequireRole,
} from '@/modules/routes/route-guards';
import { AccountPage } from '@/pages/account.page';
import { HomePage } from '@/pages/home.page';
import { LoginPage } from '@/pages/login.page';
import { SettingsPage } from '@/pages/settings.page';
import { UsersPage } from '@/pages/users.page';

function App() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route element={<RequireRole roles={[UserRole.Admin]} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
