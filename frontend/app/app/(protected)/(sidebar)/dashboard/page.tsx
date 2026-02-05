"use client";

import { useAuth } from "@/providers/auth-provider";

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading user info...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="space-y-2">
        <p>
          <strong>ID:</strong> {user.id}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>First Name:</strong> {user.first_name}
        </p>
        <p>
          <strong>Middle Name:</strong> {user.middle_name || "-"}
        </p>
        <p>
          <strong>Last Name:</strong> {user.last_name}
        </p>
        <p>
          <strong>Role:</strong> {user.role}
        </p>
      </div>
    </div>
  );
}
