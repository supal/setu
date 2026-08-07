import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleGate } from "./components/RoleGate";
import { Login } from "./routes/Login";
import { ForgotPassword } from "./routes/ForgotPassword";
import { ResetPassword } from "./routes/ResetPassword";
import { SetPassword } from "./routes/SetPassword";
import { Overview } from "./routes/Overview";
import { Users } from "./routes/Users";
import { Sites } from "./routes/Sites";
import { AuditLog } from "./routes/AuditLog";
import { Profile } from "./routes/Profile";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-password" element={<SetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/sites" element={<Sites />} />
          <Route element={<RoleGate allow={["ADMIN"]} />}>
            <Route path="/users" element={<Users />} />
            <Route path="/audit-log" element={<AuditLog />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
