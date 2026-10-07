<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function authenticate()
{
    $headers = getallheaders();

    if (!isset($headers['Authorization'])) {
        http_response_code(401);

        echo json_encode([
            'message' => 'Authentication required'
        ]);

        exit;
    }

    if (!preg_match(
        '/Bearer\s+(.*)$/i',
        $headers['Authorization'],
        $matches
    )) {
        http_response_code(401);

        echo json_encode([
            'message' => 'Invalid authorization header'
        ]);

        exit;
    }

    $token = $matches[1];

    try {

        $decoded = JWT::decode(
            $token,
            new Key(JWT_SECRET, 'HS256')
        );

        return $decoded;

    } catch (Exception $e) {

        http_response_code(401);

        echo json_encode([
            'message' => 'Invalid or expired token'
        ]);

        exit;
    }
}
/* Read Authorization header.

Extract Bearer token.

Decode JWT.

Validate signature.

Validate expiry.

Return authenticated user information. */