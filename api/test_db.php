<?php
require_once 'config.php';

$db = getDB();

if ($db) {
    echo json_encode([
        'status'  => 'success',
        'message' => 'Koneksi database berhasil!',
        'host'    => DB_HOST,
        'db'      => DB_NAME
    ]);
    $db->close();
} else {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Koneksi gagal'
    ]);
}
?>