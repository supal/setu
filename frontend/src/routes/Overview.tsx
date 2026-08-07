import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";

export function Overview() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
      <Card className="p-6">
        <p className="text-slate-600">
          Welcome back, <strong>{user?.name}</strong>. Site and map modules will appear here soon.
        </p>
      </Card>
    </div>
  );
}
