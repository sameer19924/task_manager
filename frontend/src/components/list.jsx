import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { handleUnauthorized } from "../utils/auth";
import { API } from "../config/api";

import "../css/List.css";

const STATUS_OPTIONS = ["todo", "in-progress", "done"];
const PRIORITY_OPTIONS = ["low", "medium", "high"];
const LIMIT_OPTIONS = [5, 10, 20, 50];

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  due_date: "",
  owner: "",
};

export default function List() {
  const navigate = useNavigate();

  let taskURL = API.tasks;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
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

  // add form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // edit
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const userDetail = JSON.parse(localStorage.getItem("user_detail"));

  const role = userDetail?.role;
  //alert(role);

  // small helper so add/delete/update can trigger a refetch
  const [refreshKey, setRefreshKey] = useState(0);

  // ---- Load tasks (refetches when status/page/limit change) ----
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page, limit });
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(taskURL + `?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (handleUnauthorized(res.status)) {
          return;
        }

        const data = await res.json();
        if (!res.ok || !data.success) alert(data.message);

        setTasks(data.tasks);
        if (data.pagination) setPagination(data.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [statusFilter, page, limit, refreshKey]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, limit]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_detail");
    navigate("/login");
  };

  const userList = () => {
    navigate("/users");
  };

  // ---- Add task ----
  const handleAddTask = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Title is required.");

    try {
      const res = await fetch(taskURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(form),
      });

      if (handleUnauthorized(res.status)) {
        return;
      }
      const data = await res.json();

      if (!res.ok || !data.success)
        throw new Error(data.message || "Failed to add");

      if (res.status == 200) {
        Swal.fire({
          title: "Added Successfully!",
          text: "",
          icon: "success",
        });
      }

      setForm(EMPTY_FORM);
      setShowForm(false);

      // Reload current page so pagination totals update
      setPage(1);
      // If already on page 1, force a refetch by toggling a refresh key:
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  // ---- Edit ----
  const openEdit = (task) => {
    setError("");
    setEditingTask({
      ...task,
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
    });
  };
  const closeEdit = () => setEditingTask(null);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editingTask.title.trim()) return setError("Title is required.");

    setSaving(true);
    setError("");

    try {
      const res = await fetch(taskURL + `?id=${editingTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
          status: editingTask.status,
          priority: editingTask.priority,
          due_date: editingTask.due_date || null,
          owner: editingTask.owner || null,
        }),
      });
      if (handleUnauthorized(res.status)) {
        return;
      }
      const data = await res.json();

      if (!res.ok || !data.success)
        throw new Error(data.message || "Failed to update");

      if (res.status == 200) {
        Swal.fire({
          title: "Updated Successfully!",
          text: "",
          icon: "success",
        });
      }

      // Replace in list
      setTasks((prev) =>
        prev.map((t) => (t.id === data.task.id ? data.task : t)),
      );

      // If the edited task no longer matches the current status filter, refetch
      if (statusFilter !== "all" && data.task.status !== statusFilter) {
        setRefreshKey((k) => k + 1);
      }

      setEditingTask(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const res = await fetch(taskURL + `?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (handleUnauthorized(res.status)) {
        return;
      }
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.message);

      if (res.status == 200) {
        Swal.fire({
          title: "Deleted Successfully!",
          text: "",
          icon: "success",
        });
      }

      // Reload the current page (so totals & pagination stay accurate)
      setRefreshKey((k) => k + 1);
      navigate("/list");
    } catch (err) {
      setError(err.message);
    }
  };

  // Include refreshKey in load effect deps
  useEffect(() => {
    // this is the same loadTasks function — but the previous effect
    // already runs on [statusFilter, page, limit], so add refreshKey there:
  }, [refreshKey]);

  // ---- Client-side filter (priority + search only) ----
  const visibleTasks = tasks.filter((t) => {
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !t.title.toLowerCase().includes(q) &&
        !(t.description || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="list-page">
      {/* Header */}
      <header className="list-header">
        <div>
          <h1>My Tasks</h1>
          <p className="muted">
            Showing {visibleTasks.length} of {pagination.total} tasks
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => setShowForm((s) => !s)}
          >
            {showForm ? "Cancel" : "+ New Task"}
          </button>
          {role == "admin" && (
            <button className="btn-users" onClick={userList}>
              👥 Users
            </button>
          )}

          <button className="btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Add-task form */}
      {showForm && (
        <form className="task-form" onSubmit={handleAddTask}>
          <div className="grid-2">
            <label>
              Title *
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>

            {role === "admin" && (
              <label>
                Owner (user ID)
                <input
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                />
              </label>
            )}
          </div>

          <label>
            Description
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>

          <div className="grid-3">
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </label>
          </div>

          <button type="submit" className="btn-primary">
            Save Task
          </button>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      {/* Filters */}
      <div className="filters">
        <div className="tabs">
          {["all", ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              className={statusFilter === s ? "tab active" : "tab"}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="filter-right">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <input
            className="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="muted">Loading tasks…</p>
      ) : visibleTasks.length === 0 ? (
        <p className="muted">No tasks match your filters.</p>
      ) : (
        <ul className="task-list">
          {visibleTasks.map((t) => (
            <li key={t.id} className={`task-card status-${t.status}`}>
              <div className="task-main">
                <div className="task-title-row">
                  <h3>{t.title}</h3>
                  <span className={`badge priority-${t.priority}`}>
                    {t.priority}
                  </span>
                </div>

                {t.description && <p className="task-desc">{t.description}</p>}

                <div className="task-meta">
                  <span className={`badge status-${t.status}`}>{t.status}</span>
                  {t.due_date && (
                    <span
                      className={
                        t.due_date &&
                        new Date(t.due_date) < new Date() &&
                        t.status !== "done"
                          ? "meta overdue"
                          : "meta"
                      }
                    >
                      📅 {new Date(t.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {t.owner && <span className="meta">👤 #{t.owner}</span>}
                </div>
              </div>

              <div className="task-actions">
                <button
                  className="btn-icon"
                  title="Edit"
                  onClick={() => openEdit(t)}
                >
                  ✎
                </button>
                <button
                  className="btn-icon danger"
                  title="Delete"
                  onClick={() => handleDelete(t.id)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
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
            title="Tasks per page"
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Edit modal — same as before */}
      {editingTask && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <form
            className="modal"
            onSubmit={handleUpdate}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Edit Task</h2>
              <button type="button" className="btn-icon" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <label>
              Title *
              <input
                value={editingTask.title}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, title: e.target.value })
                }
                required
              />
            </label>

            <label>
              Description
              <textarea
                rows={3}
                value={editingTask.description || ""}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    description: e.target.value,
                  })
                }
              />
            </label>

            <div className="grid-3">
              <label>
                Status
                <select
                  value={editingTask.status}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, status: e.target.value })
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={editingTask.priority}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, priority: e.target.value })
                  }
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={editingTask.due_date || ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, due_date: e.target.value })
                  }
                />
              </label>
            </div>

            {role === "admin" && (
              <label>
                Owner (user ID)
                <input
                  value={editingTask.owner || ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, owner: e.target.value })
                  }
                />
              </label>
            )}

            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={closeEdit}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
