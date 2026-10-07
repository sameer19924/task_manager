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

$method = $_SERVER['REQUEST_METHOD'];

try {
    // ----------------- GET: list users -----------------
    if ($method === 'GET') {
        $id           = $_GET['id']           ?? null;
        $role         = $_GET['role']         ?? null;    // admin | user
        $status       = $_GET['status']       ?? null;    // 1 | 2
        $page         = max(1, (int)($_GET['page']  ?? 1));
        $limit        = min(100, max(1, (int)($_GET['limit'] ?? 10)));
        $offset       = ($page - 1) * $limit;

        // Single user
        if ($id !== null) {
            $stmt = $pdo->prepare(
                "SELECT id, name, email, role, status, created_at FROM users WHERE id = ?"
            );
            $stmt->execute([$id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "users" => $user ? [$user] : []]);
            exit;
        }

        // Filters
        $where  = [];
        $params = [];

        if ($role !== null && $role !== '' && $role !== 'all') {
            $where[] = "role = ?";
            $params[] = $role;
        }
        if ($status !== null && $status !== '' && $status !== 'all') {
            $where[] = "status = ?";
            $params[] = (int)$status;
        }

        $whereSQL = $where ? " WHERE " . implode(" AND ", $where) : "";

        // Count
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users" . $whereSQL);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Page
        $sql = "SELECT id, name, email, role, status, created_at
                FROM users" . $whereSQL . "
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?";

        $stmt = $pdo->prepare($sql);
        $i = 1;
        foreach ($params as $p) {
            $stmt->bindValue($i++, $p, is_int($p) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue($i++, $limit,  PDO::PARAM_INT);
        $stmt->bindValue($i++, $offset, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode([
            "success"    => true,
            "users"      => $stmt->fetchAll(PDO::FETCH_ASSOC),
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

    // ----------------- PUT: toggle status -----------------
    if ($method === 'PUT') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing id"]);
            exit;
        }

        $in = json_decode(file_get_contents("php://input"), true);
        $status = (int)($in['status'] ?? 0);

        if (!in_array($status, [1, 2], true)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid status (1 or 2)"]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);

        // Return updated row
        $sel = $pdo->prepare(
            "SELECT id, name, email, role, status, created_at FROM users WHERE id = ?"
        );
        $sel->execute([$id]);
        $user = $sel->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "User not found"]);
            exit;
        }

        echo json_encode(["success" => true, "user" => $user]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}