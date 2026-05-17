"use client";

import { useEffect, useState } from "react";

type UserRole = "Admin" | "Read / Write" | "Read Only";

type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
};

const ADMIN_EMAIL = "arye6700@gmail.com";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("1234");
  const [role, setRole] = useState<UserRole>("Read Only");

  useEffect(() => {
    loadUsers();
    setCurrentEmail(localStorage.getItem("halfi_user_email") || "");
  }, []);

  function loadUsers() {
    const saved = localStorage.getItem("halfi_users");
    const parsed: AppUser[] = saved ? JSON.parse(saved) : [];

    const hasAdmin = parsed.some(
      (user) => normalizeEmail(user.email) === ADMIN_EMAIL
    );

    const finalUsers: AppUser[] = hasAdmin
  ? parsed
  : [
      {
        id: `USER-${Date.now()}`,
        name: "Admin",
        email: ADMIN_EMAIL,
        password: "1234",
        role: "Admin" as UserRole,
        active: true,
      },
      ...parsed,
    ];

    setUsers(finalUsers);
    localStorage.setItem("halfi_users", JSON.stringify(finalUsers));
  }

  function saveUsers(updated: AppUser[]) {
    setUsers(updated);
    localStorage.setItem("halfi_users", JSON.stringify(updated));
  }

  function addUser() {
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }

    if (!email.trim()) {
      alert("Email is required.");
      return;
    }

    if (!password.trim()) {
      alert("Password is required.");
      return;
    }

    const cleanEmail = normalizeEmail(email);

    if (users.some((user) => normalizeEmail(user.email) === cleanEmail)) {
      alert("This user already exists.");
      return;
    }

    const newUser: AppUser = {
      id: `USER-${Date.now()}`,
      name,
      email: cleanEmail,
      password,
      role,
      active: true,
    };

    saveUsers([newUser, ...users]);

    setName("");
    setEmail("");
    setPassword("1234");
    setRole("Read Only");
  }

 function updateUser(id: string, updates: Partial<AppUser>) {
  const updated: AppUser[] = users.map((user): AppUser => {
    if (user.id !== id) return user;

    if (normalizeEmail(user.email) === ADMIN_EMAIL) {
      return {
        ...user,
        ...updates,
        email: ADMIN_EMAIL,
        role: "Admin" as UserRole,
        active: true,
      };
    }

    return {
      ...user,
      ...updates,
      role: (updates.role || user.role) as UserRole,
    };
  });

  saveUsers(updated);
}
  function deleteUser(user: AppUser) {
    if (normalizeEmail(user.email) === ADMIN_EMAIL) {
      alert("Main admin cannot be deleted.");
      return;
    }

    if (!confirm("Delete this user?")) return;

    saveUsers(users.filter((savedUser) => savedUser.id !== user.id));
  }

  const currentUser = users.find(
    (user) => normalizeEmail(user.email) === normalizeEmail(currentEmail)
  );

  const isAdmin = currentUser?.role === "Admin" || normalizeEmail(currentEmail) === ADMIN_EMAIL;

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-zinc-100 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black">Users</h1>
          <p className="mt-3 text-red-700 font-bold">
            Only the admin can manage users.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            USERS
          </h1>
          <p className="mt-2 text-zinc-300">
            Manage who can access Halfi and choose read/write permissions.
          </p>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Add User</h2>

          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-bold">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="User name"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@email.com"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Permission</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-2 w-full rounded-xl border px-4 py-3 font-bold"
              >
                <option value="Read Only">Read Only</option>
                <option value="Read / Write">Read / Write</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addUser}
                className="w-full rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
              >
                Add User
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Saved Users</h2>

          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Password</th>
                  <th className="p-4">Permission</th>
                  <th className="p-4">Active</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const isMainAdmin = normalizeEmail(user.email) === ADMIN_EMAIL;

                  return (
                    <tr key={user.id} className="border-t">
                      <td className="p-4">
                        <input
                          value={user.name}
                          onChange={(e) =>
                            updateUser(user.id, { name: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2"
                        />
                      </td>

                      <td className="p-4 font-bold">
                        {isMainAdmin ? (
                          user.email
                        ) : (
                          <input
                            value={user.email}
                            onChange={(e) =>
                              updateUser(user.id, {
                                email: normalizeEmail(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border px-3 py-2"
                          />
                        )}
                      </td>

                      <td className="p-4">
                        <input
                          value={user.password}
                          onChange={(e) =>
                            updateUser(user.id, { password: e.target.value })
                          }
                          className="w-full rounded-lg border px-3 py-2"
                        />
                      </td>

                      <td className="p-4">
                        <select
                          value={user.role}
                          disabled={isMainAdmin}
                          onChange={(e) =>
                            updateUser(user.id, {
                              role: e.target.value as UserRole,
                            })
                          }
                          className="w-full rounded-lg border px-3 py-2 font-bold disabled:bg-zinc-100"
                        >
                          <option value="Read Only">Read Only</option>
                          <option value="Read / Write">Read / Write</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <select
                          value={user.active ? "yes" : "no"}
                          disabled={isMainAdmin}
                          onChange={(e) =>
                            updateUser(user.id, {
                              active: e.target.value === "yes",
                            })
                          }
                          className="w-full rounded-lg border px-3 py-2 font-bold disabled:bg-zinc-100"
                        >
                          <option value="yes">Active</option>
                          <option value="no">Disabled</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          disabled={isMainAdmin}
                          onClick={() => deleteUser(user)}
                          className={`rounded-xl px-4 py-2 font-bold ${
                            isMainAdmin
                              ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
                              : "bg-red-600 text-white"
                          }`}
                        >
                          {isMainAdmin ? "Main Admin" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-2xl bg-zinc-100 p-4 text-sm">
            <b>Admin:</b> full access and can manage users. <br />
            <b>Read / Write:</b> can add and edit records. <br />
            <b>Read Only:</b> can view pages, but should not add/delete/edit.
          </div>
        </div>
      </div>
    </main>
  );
}
