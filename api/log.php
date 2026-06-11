<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Method tidak diizinkan']);
    exit();
}

$input  = json_decode(file_get_contents('php://input'), true);
$durasi = intval($input['durasi'] ?? 10);
$jenis  = $input['jenis']         ?? 'manual';
$status = $input['status']        ?? '';

if (!in_array($status, ['mulai', 'selesai'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Status tidak valid']);
    exit();
}

if (!in_array($jenis, ['manual', 'otomatis'], true)) {
    $jenis = 'manual';
}

$db   = getDB();
$stmt = $db->prepare(
    "INSERT INTO tbl_log (durasi, jenis, status, created_at)
     VALUES (?, ?, ?, NOW())"
);
$stmt->bind_param('iss', $durasi, $jenis, $status);
$stmt->execute();

if ($status === 'selesai') {
    $db->query(
        "UPDATE tbl_command SET status='selesai'
         WHERE status='diproses'
         ORDER BY id DESC LIMIT 1"
    );
}

$db->close();
echo json_encode(['success' => true]);