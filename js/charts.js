/**
 * =============================================================================
 * MODULE: CHARTS (charts.js) - Penambahan Line Chart Tren Tanggal
 * =============================================================================
 */

const AppCharts = {
  chartDiagnosa: null,
  chartUsia: null,
  chartTren: null, // Variabel grafik tren tanggal

  init: function() {
    // 1. Grafik Donat: Top Diagnosa
    const ctxDiag = document.getElementById('chartDiagnosa').getContext('2d');
    this.chartDiagnosa = new Chart(ctxDiag, {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: ['#0d9488', '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // 2. Diagram Batang: Distribusi Usia
    const ctxUsia = document.getElementById('chartUsia').getContext('2d');
    this.chartUsia = new Chart(ctxUsia, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Jumlah Pasien', data: [], backgroundColor: '#14b8a6', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    // 3. Diagram Garis (Line Chart): Tren Kunjungan Naik/Turun Berdasarkan Tanggal
    const ctxTren = document.getElementById('chartTrenTanggal').getContext('2d');
    this.chartTren = new Chart(ctxTren, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Jumlah Pasien Harian',
          data: [],
          borderColor: '#0d9488',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3 // Membuat garis sedikit melengkung halus
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  },

  update: function(records) {
    if (!this.chartDiagnosa || !this.chartUsia || !this.chartTren) return;

    // A. Update Diagnosa
    const diagCounts = {};
    records.forEach(r => {
      const d = r.diagnosa || 'Lainnya';
      diagCounts[d] = (diagCounts[d] || 0) + 1;
    });
    const sortedDiag = Object.entries(diagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    this.chartDiagnosa.data.labels = sortedDiag.map(x => x[0].length > 25 ? x[0].slice(0, 25) + '...' : x[0]);
    this.chartDiagnosa.data.datasets[0].data = sortedDiag.map(x => x[1]);
    this.chartDiagnosa.update();

    // B. Update Usia
    const usiaCounts = { '0-1 Tahun': 0, '1-5 Tahun': 0, '5-18 Tahun': 0, '18-59 Tahun': 0, '>60 Tahun': 0 };
    records.forEach(r => {
      if (usiaCounts[r.rentangUsia] !== undefined) usiaCounts[r.rentangUsia]++;
    });
    this.chartUsia.data.labels = Object.keys(usiaCounts);
    this.chartUsia.data.datasets[0].data = Object.values(usiaCounts);
    this.chartUsia.update();

    // C. Update Tren Tanggal (Naik / Turun Harian)
    const dateCounts = {};
    records.forEach(r => {
      const tgl = r.tanggal || 'Tanpa Tanggal';
      dateCounts[tgl] = (dateCounts[tgl] + 1) || 1;
    });

    // Urutkan tanggal secara kronologis (dari yang terlama ke terbaru)
    const sortedDates = Object.keys(dateCounts).sort();
    const dateValues = sortedDates.map(d => dateCounts[d]);

    this.chartTren.data.labels = sortedDates;
    this.chartTren.data.datasets[0].data = dateValues;
    this.chartTren.update();
  }
};