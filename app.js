const API = 'api/';
let chart;
let countdownTimer;

function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

function setKoneksi(online) {
  const dot = document.getElementById('conn-dot');
  const lbl = document.getElementById('conn-label');
  dot.className = 'conn-dot' + (online ? '' : ' offline');
  lbl.textContent = online ? 'Terhubung' : 'Tidak terhubung';
}

function initChart() {
  const ctx = document.getElementById('chartSiram').getContext('2d');
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
      datasets: [{
        label: 'Jumlah Siram',
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(99,153,34,0.75)',
        hoverBackgroundColor: '#639922',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: 'rgba(59,109,17,0.15)',
          borderWidth: 1,
          titleColor: '#5a7040',
          bodyColor: '#1a2e0a',
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y}x siram`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#5a7040',
            font: { size: 11 },
            stepSize: 1,
            callback: v => Number.isInteger(v) ? v + 'x' : ''
          },
          grid: { color: 'rgba(59,109,17,0.07)' },
          border: { display: false }
        },
        x: {
          ticks: {
            color: '#5a7040',
            font: { size: 11 }
          },
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });
}

async function fetchStatus() {
  try {
    const res  = await fetch(API + 'sensor.php?action=latest');
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    setKoneksi(true);

    const pompaOn  = data.pompa_status == 1;
    const pompaDot = document.getElementById('pompa-dot');
    pompaDot.className = 'pompa-dot ' + (pompaOn ? 'on' : 'off');
    document.getElementById('pompa-label').textContent = pompaOn ? 'Menyala' : 'Mati';

    document.getElementById('val-total').innerHTML =
      (data.total_hari_ini ?? '--') + '<span class="metric-unit">x</span>';

    document.getElementById('val-siram-terakhir').textContent =
      data.siram_terakhir || '--';

  } catch (e) {
    setKoneksi(false);
  }
}

async function fetchWeekly() {
  try {
    const res  = await fetch(API + 'sensor.php?action=weekly');
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    if (!chart) return;
    chart.data.labels           = data.map(d => d.hari);
    chart.data.datasets[0].data = data.map(d => d.total);
    chart.update('none');
  } catch (e) { /* silent */ }
}

async function fetchLog() {
  try {
    const res  = await fetch(API + 'sensor.php?action=log');
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    const tbody = document.getElementById('log-body');

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="log-empty">
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
      </tr>
    `).join('');

  } catch (e) { /* silent */ }
}

async function kirimSiram() {
  const btn = document.getElementById('btn-siram');
  btn.disabled = true;
  try {
    const res  = await fetch(API + 'command.php', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ perintah: 'siram', durasi: 10 })
    });
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    if (data.success) {
      showToast('✅ Perintah siram dikirim!');
      mulaiCountdown(13);
    } else {
      showToast('❌ Gagal kirim perintah');
      btn.disabled = false;
    }
  } catch (e) {
    showToast('❌ Tidak dapat terhubung ke server');
    btn.disabled = false;
  }
}

function mulaiCountdown(detikTotal) {
  const wrap   = document.getElementById('countdown-wrap');
  const bar    = document.getElementById('countdown-bar');
  const num    = document.getElementById('countdown-num');
  const teks   = document.getElementById('countdown-text');
  const BUFFER = 3;
  const DURASI_POMPA = detikTotal - BUFFER; // 10 detik

  wrap.style.display = 'block';
  bar.style.width    = '100%';
  let sisa = detikTotal;

  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    sisa--;
    bar.style.width = (sisa / detikTotal * 100) + '%';

    if (sisa >= DURASI_POMPA) {
      teks.textContent = 'Menunggu ESP32...';
      num.textContent  = DURASI_POMPA;
    } else {
      teks.textContent = 'Menyiram...';
      num.textContent  = sisa;
    }

    if (sisa <= 0) {
      clearInterval(countdownTimer);
      wrap.style.display = 'none';
      document.getElementById('btn-siram').disabled = false;
      showToast('✅ Penyiraman selesai');
      fetchStatus();
      fetchLog();
      fetchWeekly();
    }
  }, 1000);
}

initChart();
fetchStatus();
fetchWeekly();
fetchLog();

setInterval(fetchStatus,  4000);
setInterval(fetchLog,    15000);
setInterval(fetchWeekly, 300000);