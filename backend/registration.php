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


try {

    // Only allow POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);

        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);

        exit;
    }

    // Read JSON request body
    $data = json_decode(
        file_get_contents('php://input'),
        true
    );

    // Validate required fields
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if ($name === '' || $email === '' || $password === '') {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Name, email and password are required'
        ]);

        exit;
    }

    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Invalid email address'
        ]);

        exit;
    }

    // Validate password
    if (strlen($password) < 8) {

        http_response_code(422);

        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 8 characters'
        ]);

        exit;
    }

    // Check whether email already exists
    $stmt = $pdo->prepare(
        "SELECT id FROM users WHERE email = ? LIMIT 1"
    );

    $stmt->execute([$email]);

    if ($stmt->fetch()) {

        http_response_code(409);

        echo json_encode([
            'success' => false,
            'message' => 'Email already registered'
        ]);

        exit;
    }

    // Hash password
    $passwordHash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    // Create user
    // Role is intentionally NOT taken from request.
    $stmt = $pdo->prepare(
        "INSERT INTO users
            (name, email, password, role)
         VALUES
            (?, ?, ?, 'user')"
    );

    $stmt->execute([
        $name,
        $email,
        $passwordHash
    ]);

    $userId = $pdo->lastInsertId();

    // Success response
    http_response_code(201);

    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'user' => [
            'id' => (int) $userId,
            'name' => $name,
            'email' => $email,
            'role' => 'user'
        ]
    ]);

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Something went wrong'
    ]);
}
