<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';

// -------------------------------------------------------
// ESP32 POST data pompa ke sini (opsional, tidak wajib)
// POST /api/sensor.php
// -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input        = json_decode(file_get_contents('php://input'), true);
    $pompa_status = intval($input['pompa_status'] ?? 0);

    $db   = getDB();
    $stmt = $db->prepare("INSERT INTO tbl_sensor (pompa_status, created_at) VALUES (?, NOW())");
    $stmt->bind_param('i', $pompa_status);
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

    // Status pompa: baca dari log terbaru yang dikirim ESP32
    // 'mulai'   → pompa sedang menyala
    // 'selesai' → pompa sudah mati
    $logTerbaru = $db->query("SELECT status FROM tbl_log ORDER BY id DESC LIMIT 1")->fetch_assoc();
    $pompaOn    = ($logTerbaru && $logTerbaru['status'] === 'mulai') ? 1 : 0;

    // Siram terakhir (waktu pompa selesai)
    $last = $db->query("SELECT created_at FROM tbl_log WHERE status='selesai' ORDER BY id DESC LIMIT 1")->fetch_assoc();

    // Total siram hari ini
    $total = $db->query("SELECT COUNT(*) as total FROM tbl_log WHERE DATE(created_at) = CURDATE() AND status='selesai'")->fetch_assoc();

    $db->close();

    echo json_encode([
        'pompa_status'   => $pompaOn,
        'siram_terakhir' => $last ? date('d/m H:i', strtotime($last['created_at'])) : null,
        'total_hari_ini' => $total['total'] ?? 0,
    ]);
    exit();
}

// -------------------------------------------------------
// GET: riwayat penyiraman 7 hari terakhir untuk bar chart
// -------------------------------------------------------
if ($action === 'weekly') {
    $db = getDB();

    $result = $db->query("
        SELECT
            DATE(created_at) AS tanggal,
            COUNT(*)         AS total
        FROM tbl_log
        WHERE created_at >= CURDATE() - INTERVAL 6 DAY
          AND status = 'selesai'
        GROUP BY DATE(created_at)
        ORDER BY tanggal ASC
    ");

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    $db->close();

    $namaHari = [
        'Monday'    => 'Sen',
        'Tuesday'   => 'Sel',
        'Wednesday' => 'Rab',
        'Thursday'  => 'Kam',
        'Friday'    => 'Jum',
        'Saturday'  => 'Sab',
        'Sunday'    => 'Min',
    ];

    $hasil = [];
    for ($i = 6; $i >= 0; $i--) {
        $tgl     = date('Y-m-d', strtotime("-$i day"));
        $engHari = date('l', strtotime($tgl));
        $total   = 0;

        foreach ($rows as $r) {
            if ($r['tanggal'] === $tgl) {
                $total = (int) $r['total'];
                break;
            }
        }

        $hasil[] = [
            'hari'  => $namaHari[$engHari] ?? $engHari,
            'total' => $total,
        ];
    }

    echo json_encode($hasil);
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
            jenis
        FROM tbl_log
        WHERE status = 'selesai'
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