<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';

// -------------------------------------------------------
// ESP32 POST data sensor ke sini
// POST /api/sensor.php
// Body: { "kelembaban": 45, "pompa_status": 0 }
// -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $kelembaban   = floatval($input['kelembaban'] ?? 0);
    $pompa_status = intval($input['pompa_status'] ?? 0);

    $db = getDB();
    $stmt = $db->prepare("INSERT INTO tbl_sensor (kelembaban, pompa_status, created_at) VALUES (?, ?, NOW())");
    $stmt->bind_param('di', $kelembaban, $pompa_status);
    $stmt->execute();
    $db->close();

    echo json_encode(['success' => true]);
    exit();
}

// -------------------------------------------------------
// GET: ambil data terbaru untuk dashboard
// -------------------------------------------------------
if ($action === 'latest') {
    $db = getDB();

    // Data sensor terbaru
    $row = $db->query("SELECT kelembaban, pompa_status, created_at FROM tbl_sensor ORDER BY id DESC LIMIT 1")->fetch_assoc();

    // Siram terakhir
    $last = $db->query("SELECT created_at FROM tbl_log WHERE status='selesai' ORDER BY id DESC LIMIT 1")->fetch_assoc();

    // Total siram hari ini
    $total = $db->query("SELECT COUNT(*) as total FROM tbl_log WHERE DATE(created_at) = CURDATE() AND status='selesai'")->fetch_assoc();

    $db->close();

    echo json_encode([
        'kelembaban'     => $row ? round($row['kelembaban'], 1) : 0,
        'pompa_status'   => $row ? intval($row['pompa_status']) : 0,
        'siram_terakhir' => $last ? date('d/m H:i', strtotime($last['created_at'])) : null,
        'total_hari_ini' => $total['total'] ?? 0
    ]);
    exit();
}

// -------------------------------------------------------
// GET: history 24 jam terakhir untuk grafik
// -------------------------------------------------------
if ($action === 'history') {
    $db = getDB();
    $result = $db->query("
        SELECT
            DATE_FORMAT(created_at, '%H:%i') AS jam,
            ROUND(AVG(kelembaban), 1) AS kelembaban
        FROM tbl_sensor
        WHERE created_at >= NOW() - INTERVAL 24 HOUR
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H')
        ORDER BY created_at ASC
        LIMIT 24
    ");

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    $db->close();
    echo json_encode($data);
    exit();
}

// -------------------------------------------------------
// GET: log riwayat penyiraman
// -------------------------------------------------------
if ($action === 'log') {
    $db = getDB();
    $result = $db->query("
        SELECT
            DATE_FORMAT(created_at, '%d/%m %H:%i') AS waktu,
            durasi,
            jenis,
            kelembaban_saat_itu AS kelembaban
        FROM tbl_log
        ORDER BY id DESC
        LIMIT 20
    ");

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    $db->close();
    echo json_encode($data);
    exit();
}

echo json_encode(['error' => 'Action tidak dikenali']);
?>
