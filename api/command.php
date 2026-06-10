<?php
require_once 'config.php';

// -------------------------------------------------------
// Dashboard POST perintah siram ke sini
// POST /api/command.php
// Body: { "perintah": "siram", "durasi": 10 }
// -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input    = json_decode(file_get_contents('php://input'), true);
    $perintah = $input['perintah'] ?? '';
    $durasi   = intval($input['durasi'] ?? 10);

    if ($perintah !== 'siram') {
        echo json_encode(['success' => false, 'message' => 'Perintah tidak dikenali']);
        exit();
    }

    $db = getDB();

    // Simpan perintah dengan status 'pending'
    $stmt = $db->prepare("INSERT INTO tbl_command (perintah, durasi, status, created_at) VALUES (?, ?, 'pending', NOW())");
    $stmt->bind_param('si', $perintah, $durasi);
    $stmt->execute();
    $db->close();

    echo json_encode(['success' => true, 'message' => 'Perintah dikirim']);
    exit();
}

// -------------------------------------------------------
// ESP32 GET perintah dari sini (polling setiap 3 detik)
// GET /api/command.php
// ESP32 cek apakah ada perintah pending
// -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $db = getDB();

    // Ambil perintah pending terbaru
    $row = $db->query("SELECT id, perintah, durasi FROM tbl_command WHERE status='pending' ORDER BY id ASC LIMIT 1")->fetch_assoc();

    if ($row) {
        // Tandai perintah sebagai 'diproses'
        $id = intval($row['id']);
        $db->query("UPDATE tbl_command SET status='diproses' WHERE id=$id");
        $db->close();

        echo json_encode([
            'ada_perintah' => true,
            'id'           => $id,
            'perintah'     => $row['perintah'],
            'durasi'       => intval($row['durasi'])
        ]);
    } else {
        $db->close();
        echo json_encode(['ada_perintah' => false]);
    }
    exit();
}

echo json_encode(['error' => 'Method tidak diizinkan']);
?>
