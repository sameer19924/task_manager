<?php
// login.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173"); // Vite dev server
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

// Read JSON body
$input = json_decode(file_get_contents("php://input"), true);
$email    = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Email and password required"]);
    exit;
}

// TODO: replace with real DB check
// Example using PDO:
// $stmt = $pdo->prepare("SELECT id, password_hash FROM users WHERE email = ?");
// $stmt->execute([$email]);
// $user = $stmt->fetch();

// Demo check (hardcoded)
if ($email === "mansoorhasan27396@gmail.com" && $password === "123") {
    $token = bin2hex(random_bytes(16));
    echo json_encode([
        "success" => true,
        "message" => "Login successful",
        "token"   => $token,
        "user"    => ["email" => $email]
    ]);
} else {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Invalid credentials"]);
}