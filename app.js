/* ============================================================
   Tanaman Monitor — app.js
   ============================================================ */

const API = 'api/';
let chart;
let refreshInterval;
let countdownTimer;

/* ── Toast ──────────────────────────────────────────────── */
function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

/* ── Connection indicator ───────────────────────────────── */
function setKoneksi(online) {
  const dot = document.getElementById('conn-dot');
  const lbl = document.getElementById('conn-label');
  dot.className = 'conn-dot' + (online ? '' : ' offline');
  lbl.textContent = online ? 'Terhubung' : 'Tidak terhubung';
}

/* ── Chart init ─────────────────────────────────────────── */
function initChart() {
  const ctx = document.getElementById('chartKelembaban').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Kelembaban (%)',
        data: [],
        borderColor: '#639922',
        backgroundColor: 'rgba(99,153,34,0.07)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#639922',
        pointBorderColor: 'transparent',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a2612',
          borderColor: 'rgba(97,153,34,0.2)',
          borderWidth: 1,
          titleColor: '#7a9858',
          bodyColor: '#d6eab5',
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: '#7a9858',
            font: { size: 11 },
            callback: v => v + '%'
          },
          grid: { color: 'rgba(97,153,34,0.07)' },
          border: { display: false }
        },
        x: {
          ticks: {
            color: '#7a9858',
            font: { size: 10 },
            maxTicksLimit: 8
          },
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });
}

/* ── Fetch latest sensor data ───────────────────────────── */
async function fetchStatus() {
  try {
    const res  = await fetch(API + 'sensor.php?action=latest');
    const data = await res.json();
    setKoneksi(true);

    const k = data.kelembaban ?? 0;
    document.getElementById('val-kelembaban').innerHTML =
      Math.round(k) + '<span class="metric-unit">%</span>';
    document.getElementById('kelembaban-bar').style.width = Math.round(k) + '%';

    /* Status tanah */
    const badge = document.getElementById('status-tanah-badge');
    const label = document.getElementById('status-tanah');
    if (k < 30) {
      badge.className = 'status-badge-inline dry';
      label.textContent = 'Tanah kering';
    } else if (k < 60) {
      badge.className = 'status-badge-inline on';
      label.textContent = 'Kelembaban normal';
    } else {
      badge.className = 'status-badge-inline wet';
      label.textContent = 'Tanah basah';
    }

    /* Pompa */
    const pompaOn   = data.pompa_status == 1;
    const pompaDot  = document.getElementById('pompa-dot');
    pompaDot.className = 'pompa-dot ' + (pompaOn ? 'on' : 'off');
    document.getElementById('pompa-label').textContent = pompaOn ? 'Menyala' : 'Mati';
    document.getElementById('pompa-sub').textContent =
      'Siram terakhir: ' + (data.siram_terakhir || '--');

    /* Total */
    document.getElementById('val-total').innerHTML =
      (data.total_hari_ini ?? '--') + '<span class="metric-unit">x</span>';
    document.getElementById('sub-total').textContent = 'Per hari ini';

  } catch (e) {
    setKoneksi(false);
  }
}

/* ── Fetch chart history ────────────────────────────────── */
async function fetchChart() {
  try {
    const res  = await fetch(API + 'sensor.php?action=history');
    const data = await res.json();
    if (!chart) return;
    chart.data.labels              = data.map(d => d.jam);
    chart.data.datasets[0].data   = data.map(d => Math.round(d.kelembaban));
    chart.update('none');
  } catch (e) { /* silent */ }
}

/* ── Fetch watering log ─────────────────────────────────── */
async function fetchLog() {
  try {
    const res  = await fetch(API + 'sensor.php?action=log');
    const data = await res.json();
    const tbody = document.getElementById('log-body');

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="log-empty">
            <div class="log-empty-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                   style="color:var(--text-muted); opacity:0.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Belum ada riwayat.</span>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${r.waktu}</td>
        <td>${r.durasi} detik</td>
        <td><span class="badge-${r.jenis}">${r.jenis}</span></td>
        <td>${Math.round(r.kelembaban)}%</td>
      </tr>
    `).join('');

  } catch (e) { /* silent */ }
}

/* ── Send water command ─────────────────────────────────── */
async function kirimSiram() {
  const btn = document.getElementById('btn-siram');
  btn.disabled = true;
  try {
    const res  = await fetch(API + 'command.php', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ perintah: 'siram', durasi: 10 })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ Perintah siram dikirim!');
      mulaiCountdown(10);
    } else {
      showToast('❌ Gagal kirim perintah');
      btn.disabled = false;
    }
  } catch (e) {
    showToast('❌ Tidak dapat terhubung ke server');
    btn.disabled = false;
  }
}

/* ── Countdown bar ──────────────────────────────────────── */
function mulaiCountdown(detik) {
  const wrap = document.getElementById('countdown-wrap');
  const bar  = document.getElementById('countdown-bar');
  const num  = document.getElementById('countdown-num');

  wrap.style.display = 'block';
  bar.style.width    = '100%';
  let sisa = detik;
  num.textContent    = sisa;

  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    sisa--;
    num.textContent    = sisa;
    bar.style.width    = (sisa / detik * 100) + '%';

    if (sisa <= 0) {
      clearInterval(countdownTimer);
      wrap.style.display = 'none';
      document.getElementById('btn-siram').disabled = false;
      showToast('✅ Penyiraman selesai');
      fetchLog();
      fetchStatus();
    }
  }, 1000);
}

/* ── Refresh all data ───────────────────────────────────── */
function refreshSemua() {
  fetchStatus();
  fetchChart();
  fetchLog();
}

/* ── Boot ───────────────────────────────────────────────── */
initChart();
refreshSemua();

refreshInterval = setInterval(fetchStatus, 4000);   // sensor: setiap 4 detik
setInterval(fetchLog,    15000);                     // log: setiap 15 detik
setInterval(fetchChart,  60000);                     // chart: setiap 1 menit
