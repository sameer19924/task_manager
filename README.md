# Task Manager

A full-stack task management app with role-based access, built with **React (Vite)**, **PHP**, and **MySQL**.

Users can create, edit, filter, and paginate tasks. Admins get an extra **User Management** screen with an active/inactive toggle.

---

## Features

### Authentication
- Email + password login
- User signup with validation & password strength meter
- Token-based JWT (stored in `localStorage`)
- Auto-logout on `401 Unauthorized`

### Tasks
- Create, edit, and delete tasks
- Fields: `title`, `description`, `status` (todo / in-progress / done), `priority` (low / medium / high), `due_date`, `owner`
- Filter by **status** (server-side) and **priority** (client-side)
- Search by title / description
- Pagination with configurable page size
- Overdue date highlighting
- Color-coded status borders and priority badges

### Users *(admin only)*
- List all users with name, email, role, and status
- Filter by role and status
- Search by name / email
- Pagination
- **Active / Inactive toggle** with optimistic UI + rollback on failure

### UX
- SweetAlert2 for success and confirm dialogs
- Consistent design system across Login, Signup, List, and Users
- Responsive layout (mobile-friendly)
- Loading, empty, and error states handled everywhere

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite |
| Styling | Plain CSS (colocated with components) |
| Alerts | SweetAlert2 |
| Backend | PHP 8 (procedural, PDO) |
| Database | MySQL / MariaDB |
| Auth | Bearer token in `Authorization` header |


Generate the hash in PHP:

```php
php -r "echo password_hash('yourpassword', PASSWORD_BCRYPT);"
```

---

## Setup

### 1. Backend (PHP + MySQL)

1. Place the `backend/` folder inside your web root:
   - **XAMPP**: `C:\xampp\htdocs\TaskManager\backend\`
   - **Laragon**: `C:\laragon\www\TaskManager\backend\`
   - **Linux**: `/var/www/html/TaskManager/backend/`

2. Create the database and tables from the SQL above.

3. Update DB credentials in each PHP file:

   ```php
   $pdo = new PDO("mysql:host=localhost;dbname=tasks_db;charset=utf8mb4", "root", "");
   ```

4. Verify an endpoint works:

   ```bash
   curl http://localhost/TaskManager/backend/task.php
   ```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**.

### 3. CORS

Each PHP file sends CORS headers for the Vite dev origin:

```php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
```

If you deploy the frontend on a different origin, update this value.

---

## 🔌 API Reference

Base URL: `http://localhost/TaskManager/backend`

### `POST /login.php`

Request:
```json
{ "email": "admin@example.com", "password": "secret" }
```

Response:
```json
{
  "success": true,
  "token": "a1b2c3...",
  "user": { "id": 1, "name": "Admin", "email": "admin@example.com", "role": "admin" }
}
```

### `POST /signup.php`

Request:
```json
{ "name": "Jane", "email": "jane@example.com", "password": "minimum8chars" }
```

Response: `{ "success": true, "token": "...", "user": { ... } }`

### `GET /task.php`

Query params: `page`, `limit`, `status`, `id`

Response:
```json
{
  "success": true,
  "tasks": [ { "id": 5, "title": "Fix bug", "status": "todo", ... } ],
  "pagination": {
    "page": 1, "limit": 10, "total": 23, "totalPages": 3,
    "hasPrev": false, "hasNext": true
  }
}
```

### `POST /task.php`

Body: `{ title, description, status, priority, due_date, owner }`

### `PUT /task.php?id=5`

Body: same fields as POST.

### `DELETE /task.php?id=5`

### `GET /users.php`

Query params: `page`, `limit`, `role`, `status`

### `PUT /users.php?id=3`

Body: `{ "status": 1 }` or `{ "status": 2 }`

---

## 🔐 Auth Flow

1. User submits login form.
2. PHP verifies password with `password_verify()`, returns a token.
3. Frontend stores token + user detail in `localStorage`:
   ```js
   localStorage.setItem("token", data.token);
   localStorage.setItem("user_detail", JSON.stringify(data.user));
   ```
4. Every subsequent request sends:
   ```
   Authorization: Bearer <token>
   ```
5. On `401`, `handleUnauthorized(res.status)` clears storage and redirects to `/login`.

---

## 🛣️ Routes

| Path | Component | Access |
|---|---|---|
| `/` | redirect → `/login` | Public |
| `/login` | `Login` | Public |
| `/signup` | `Signup` | Public |
| `/list` | `List` | Any logged-in user |
| `/users` | `Users` | Admin only (button visible only to admins) |

`ProtectedRouter` guards `/list` and `/users` — no token, no entry.



---

## 🧪 Testing the Flow

1. **Signup** → create an account.
2. **Login** → land on `/list`.
3. **Add task** → new row appears, pagination total increases.
4. **Edit task** → modal opens pre-filled, save updates the row.
5. **Delete task** → Swal confirm → row disappears (no refresh needed).
6. **Filter tabs** → switching to `todo` fetches only todo tasks.
7. **Pagination** → Next/Prev adjust `page` param; list refetches.
8. **Admin login** → "👥 Users" button appears in the header.
9. **Toggle user status** → switch flips, badge updates, DB persists.
10. **Expired token** → manually clear `token` in DevTools → next request redirects to `/login`.



---

## 🛠️ Useful Commands

```bash
# Frontend
npm install
npm run dev
npm run build
npm run preview

# PHP — start a dev server in the backend folder
php -S localhost:8000

# Test an endpoint
curl -X POST http://localhost/TaskManager/backend/login.php \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret"}'

# Generate a bcrypt hash
php -r "echo password_hash('yourpassword', PASSWORD_BCRYPT);"
```

---

## 🗺️ Roadmap

- [ ] JWT-based sessions with refresh tokens
- [ ] Server-side priority filter + search
- [ ] Optimistic updates on task create/edit
- [ ] Bulk user actions (activate/deactivate/delete)
- [ ] Avatar upload for users
- [ ] Email verification on signup
- [ ] Dark mode
- [ ] Unit tests (Vitest + PHPUnit)

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 🙌 Acknowledgements

- [Vite](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [SweetAlert2](https://sweetalert2.github.io/)
- [PDO](https://www.php.net/manual/en/book.pdo.php)