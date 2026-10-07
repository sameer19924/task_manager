import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Users.css";
import Swal from "sweetalert2";
import { API } from "../config/api";

const ROLE_OPTIONS = ["admin", "user"];
const LIMIT_OPTIONS = [5, 10, 20, 50];

export default function Users() {
  const navigate = useNavigate();
  const userDetail = JSON.parse(localStorage.getItem("user_detail"));
  const role = userDetail?.role;
  const usersURL = API.users;

  useEffect(() => {
    if (role !== "admin") {
      navigate("/list", { replace: true });
    }
  }, [role, navigate]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const taskList = () => {
    navigate("/list");
  };

  // filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState(null); // id of row currently being toggled

  // ---- Load users ----
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page, limit });
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(usersURL + `?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.message || "Failed to load");

        setUsers(data.users);
        if (data.pagination) setPagination(data.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [roleFilter, statusFilter, page, limit, refreshKey]);

  // Reset page when filters/limit change
  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, limit]);

  const handleLogout = () => {
    localStorage.removeItem("user_detail");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ---- Toggle status (1 ⇄ 2) ----
  const toggleStatus = async (user) => {
    const nextStatus = user.status === 1 ? 2 : 1;
    setBusyId(user.id);
    setError("");

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)),
    );

    try {
      const res = await fetch(usersURL + `?id=${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.status == "200") {
        Swal.fire({
          title: "Updated Successfully!",
          text: "",
          icon: "success",
        });
      }
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Update failed");

      // Reconcile with server value
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));

      // If filtering by status and row no longer matches, refetch
      if (statusFilter !== "all") setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
      // Roll back on failure
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u)),
      );
    } finally {
      setBusyId(null);
    }
  };

  // Client-side search (name / email)
  const visibleUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="users-page">
      {/* Header */}
      <header className="users-header">
        <div>
          <h1>Users</h1>
          <p className="muted">
            Showing {visibleUsers.length} of {pagination.total} users
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={taskList}>
            + My Task
          </button>
          <button className="btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      {/* Filters */}
      <div className="filters">
        <div className="tabs">
          {[
            { key: "all", label: "All" },
            { key: "admin", label: "Admins" },
            { key: "user", label: "Users" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={roleFilter === key ? "tab active" : "tab"}
              onClick={() => setRoleFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="filter-right">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="1">Active</option>
            <option value="2">Inactive</option>
          </select>

          <input
            className="search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="muted">Loading users…</p>
      ) : visibleUsers.length === 0 ? (
        <p className="muted">No users match your filters.</p>
      ) : (
        <ul className="user-list">
          {visibleUsers.map((u) => {
            const isActive = u.status === 1;
            const initial = (u.name || "?").charAt(0).toUpperCase();

            return (
              <li key={u.id} className="user-card">
                <div className="user-avatar">{initial}</div>

                <div className="user-main">
                  <div className="user-title-row">
                    <h3>{u.name}</h3>
                    <span className={`badge role-${u.role}`}>{u.role}</span>
                  </div>
                  <p className="user-email">{u.email}</p>
                  <div className="user-meta">
                    <span
                      className={`badge status-${isActive ? "active" : "inactive"}`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    {u.created_at && (
                      <span className="meta">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle switch */}
                <div className="user-actions">
                  <label
                    className={`switch ${busyId === u.id ? "busy" : ""}`}
                    title={
                      isActive ? "Click to deactivate" : "Click to activate"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={busyId === u.id}
                      onChange={() => toggleStatus(u)}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-ghost"
            disabled={!pagination.hasPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>

          <span className="page-info">
            Page <strong>{pagination.page}</strong> of{" "}
            <strong>{pagination.totalPages}</strong>
          </span>

          <button
            className="btn-ghost"
            disabled={!pagination.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>

          <select
            className="limit-select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
