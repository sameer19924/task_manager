<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__. '/jwt/auth.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$method = $_SERVER['REQUEST_METHOD'];
$user = authenticate();

$user_id = $user->user_id ? $user->user_id : NULL;
$role = $user->role ? $user->role : 'user';


if(!$user_id){
    http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Unknown user'
        ]);

        exit;
    }

$role_condition = ($role == 'user') ? " owner = '" . $user_id . "'" : " owner <> ''";

try {
    if ($method === 'GET') {
    $id       = $_GET['id']       ?? null;
    $status   = $_GET['status']   ?? null;   // todo | in-progress | done | null
    $page     = max(1, (int)($_GET['page']  ?? 1));
    $limit    = min(100, max(1, (int)($_GET['limit'] ?? 10))); // clamp 1..100
    $offset   = ($page - 1) * $limit;

    // ---------- Single task by id (no pagination) ----------
    if ($id !== null) {
    
        $stmt = $pdo->prepare(
            "SELECT id, title, description, status, priority, due_date, owner, created_at
             FROM tasks WHERE id = ? AND  $role_condition"
        );
        $stmt->execute([$id]);
        $task = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode([
            "success" => true,
            "tasks"   => $task ? [$task] : [],
        ]);
        exit;
    }

    // ---------- Build WHERE ----------
    $where  = " where ".$role_condition;
    $params = [];

    if ($status !== null && $status !== '' && $status !== 'all') {
        $where.= " AND status = ? ";
        $params[] = $status;
    }
    //echo "SELECT COUNT(*) FROM tasks " . $where;
    // ---------- Total count (for pagination math) ----------
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM tasks " . $where);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // ---------- Fetch page ----------
    $sql = "SELECT id, title, description, status, priority, due_date, owner, created_at
            FROM tasks" . $where . "
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?";
     //echo $sql;

    $stmt = $pdo->prepare($sql);
    // Bind the filter params + the LIMIT/OFFSET as integers
    $i = 1;
    foreach ($params as $p) {
        $stmt->bindValue($i++, $p, PDO::PARAM_STR);
    }
    $stmt->bindValue($i++, $limit,  PDO::PARAM_INT);
    $stmt->bindValue($i++, $offset, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode([
        "success"    => true,
        "tasks"      => $stmt->fetchAll(PDO::FETCH_ASSOC),
        "pagination" => [
            "page"       => $page,
            "limit"      => $limit,
            "total"      => $total,
            "totalPages" => (int)ceil($total / $limit),
            "hasPrev"    => $page > 1,
            "hasNext"    => $page < (int)ceil($total / $limit),
        ],
    ]);
    exit;
}

    if ($method === 'POST') {
        $in = json_decode(file_get_contents("php://input"), true);

        $title    = trim($in['title'] ?? '');
        $desc     = trim($in['description'] ?? '');
        $status   = $in['status']   ?? 'todo';
        $priority = $in['priority'] ?? 'medium';
        $due      = $in['due_date'] ?? null;
        $owner    = $role == 'admin' && !empty($in['owner']) ? $in['owner'] : $user_id ;

        if ($title === '') {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Title required"]);
            exit;
        }

        $stmt = $pdo->prepare(
          "INSERT INTO tasks (title, description, status, priority, due_date, owner)
           VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$title, $desc, $status, $priority, $due ?: null, $owner ?: null]);
        $id = $pdo->lastInsertId();

        echo json_encode(["success" => true, "task" => [
            "id" => (int)$id, "title" => $title, "description" => $desc,
            "status" => $status, "priority" => $priority,
            "due_date" => $due, "owner" => $owner,
        ]]);
        exit;
    }

    // ✅ NEW — Update an existing task
    if ($method === 'PUT') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing id"]);
            exit;
        }

        $in = json_decode(file_get_contents("php://input"), true);

        $title    = trim($in['title'] ?? '');
        $desc     = trim($in['description'] ?? '');
        $status   = $in['status']   ?? 'todo';
        $priority = $in['priority'] ?? 'medium';
        $due      = $in['due_date'] ?? null;
        //$owner    = $user_id;
        $owner    = $role == 'admin' && !empty($in['owner']) ? $in['owner'] : $user_id;

        if ($title === '') {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Title required"]);
            exit;
        }

        $stmt = $pdo->prepare(
            "UPDATE tasks
             SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, owner = ?
             WHERE id = ?"
        );
        $stmt->execute([$title, $desc, $status, $priority, $due ?: null, $owner ?: null, $id]);

        $check = $pdo->prepare("SELECT id FROM tasks WHERE id = ?");
        $check->execute([$id]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Task not found"]);
            exit;
        }

        echo json_encode(["success" => true, "task" => [
            "id"          => $id,
            "title"       => $title,
            "description" => $desc,
            "status"      => $status,
            "priority"    => $priority,
            "due_date"    => $due,
            "owner"       => $owner,
        ]]);
        exit;
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing id"]);
            exit;
        }
        $pdo->prepare("DELETE FROM tasks WHERE id = ?")->execute([$id]);
        echo json_encode(["success" => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}