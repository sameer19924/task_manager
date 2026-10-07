<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

// Handle CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;

try {

    // Only allow POST request
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

        http_response_code(405);

        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);

        exit;
    }

    // Get JSON request body
    $data = json_decode(
        file_get_contents('php://input'),
        true
    );

    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    // Validate input
    if ($email === '' || $password === '') {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Email and password are required'
        ]);

        exit;
    }

    // Find user by email
    $stmt = $pdo->prepare(
        "SELECT id, name, email, password, role,status
         FROM users
         WHERE email = ?
         LIMIT 1"
    );

    $stmt->execute([$email]);

    $user = $stmt->fetch();

    // User not found
    if (!$user) {

        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);

        exit;
    }

    
   if ((string) $user['status'] !== '1') {
    http_response_code(403);

    echo json_encode([
        'success' => false,
        'message' => 'Your account is inactive. Please contact the admin.'
    ]);

    exit;
}
    // Verify password
    if (!password_verify($password, $user['password'])) {

        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);

        exit;
    }

    // JWT secret
    $secretKey = JWT_SECRET;

    // JWT expiry: 1 hour
    $issuedAt = time();
    $expirationTime = $issuedAt + 3600;

    // JWT payload
    $payload = [
        'iat'  => $issuedAt,
        'exp'  => $expirationTime,
        'sub'  => (int) $user['id'],
        'role' => $user['role'],
        'user_id'=> (int) $user['id'],
    ];

    // Generate JWT
    $token = JWT::encode(
        $payload,
        $secretKey,
        'HS256'
    );

    // Success response
    http_response_code(200);

    echo json_encode([
        'success' => true,
        'message' => 'Login successful',

        'token' => $token,

        'expires_in' => 3600,

        'user' => [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role']
        ]
    ]);

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Database error'
    ]);

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Something went wrong'
    ]);
}