<?php
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;


$password = '1230';
print $passwordHash = password_hash(
    $password,
    PASSWORD_DEFAULT
);
