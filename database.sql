-- =============================================
-- Database schema: Penyiram Tanaman Otomatis
-- Jalankan file ini di phpMyAdmin cPanel kamu
-- =============================================

-- Tabel data sensor (ESP32 kirim tiap 3 detik)
CREATE TABLE IF NOT EXISTS `tbl_sensor` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `kelembaban`   FLOAT NOT NULL DEFAULT 0,
  `pompa_status` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`   DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel perintah dari dashboard ke ESP32
CREATE TABLE IF NOT EXISTS `tbl_command` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `perintah`   VARCHAR(50) NOT NULL,
  `durasi`     INT NOT NULL DEFAULT 10,
  `status`     ENUM('pending','diproses','selesai') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel log riwayat penyiraman
CREATE TABLE IF NOT EXISTS `tbl_log` (
  `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `durasi`              INT NOT NULL DEFAULT 10,
  `jenis`               ENUM('auto','manual') NOT NULL DEFAULT 'auto',
  `kelembaban_saat_itu` FLOAT NOT NULL DEFAULT 0,
  `status`              ENUM('mulai','selesai') NOT NULL DEFAULT 'selesai',
  `created_at`          DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Index untuk query yang sering dipakai
CREATE INDEX idx_sensor_created ON tbl_sensor(created_at);
CREATE INDEX idx_log_created    ON tbl_log(created_at);
CREATE INDEX idx_cmd_status     ON tbl_command(status);
