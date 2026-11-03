let masterRecords = [];     
let filteredRecords = [];   
let currentPage = 1;
const pageSize = 15;        

const samplePatients = [
  { puskesmas: 'Puskesmas Samboja', tanggal: '2026-09-01', nama: 'Yennefer', jk: 'Perempuan', umur: '37', rentangUsia: '18-59 Tahun', keluhan: 'Sakit Kepala Menghadapi geralt', icd: 'J03', diagnosa: 'Acute tonsillitis', alamat: 'AMBARAWANG DARAT RT 5', poli: 'KLASTER 3 (DEWASA DAN LANSIA)', rawRowData: { 'Nama Pasien': 'Yennefer', 'Keluhan': 'Sakit Kepala Meriang Batuk' } },
  { puskesmas: 'Puskesmas Samboja', tanggal: '2026-09-02', nama: 'Ronova Morgana', jk: 'Perempuan', umur: '2000', rentangUsia: '60-200 Tahun', keluhan: 'Batuk Pilek 2-3 Hari Asap', icd: 'J00', diagnosa: 'Acute nasopharyngitis [common cold]', alamat: 'KAMPUNG LAMA RT 5', poli: 'KLASTER 3 (DEWASA DAN LANSIA)', rawRowData: { 'Nama Pasien': 'Ronova Morgana', 'Keluhan': 'Batuk Pilek' } },
  { puskesmas: 'Puskesmas Handil Baru', tanggal: '2026-09-03', nama: 'Geralt of Rivia', jk: 'Laki-laki', umur: '42', rentangUsia: '18-59 Tahun', keluhan: 'Batuk habis lawan Troll', icd: 'J02.9', diagnosa: 'Acute pharyngitis, unspecified', alamat: 'SANIPAH RT 4', poli: 'UMUM', rawRowData: { 'Nama Pasien': 'Geralt of Rivia', 'Keluhan': 'Batuk, Sakit Tenggorokan' } }
];

document.addEventListener('DOMContentLoaded', async () => {
  await ExcelParser.initWilayahData();
  AppCharts.init();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('excelFileInput')?.addEventListener('change', handleExcelUpload);
  document.getElementById('btnLoadSample')?.addEventListener('click', () => { loadNewData(samplePatients, "Data Contoh Berhasil Dimuat"); });

  // Filter Dropdown biasa
  ['filterUsia', 'filterGender'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', triggerFilter);
  });

  // Filter Teks & Kalender
  ['filterNama', 'filterGejala', 'filterAlamat', 'filterStartDate', 'filterEndDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', debounce(triggerFilter, 250));
      el.addEventListener('change', triggerFilter); 
    }
  });

  // === FITUR BARU: Pencarian di dalam daftar Checkbox Puskesmas ===
  const searchPkm = document.getElementById('searchPuskesmas');
  if (searchPkm) {
    searchPkm.addEventListener('input', function() {
      const keyword = this.value.toLowerCase();
      document.querySelectorAll('#filterPuskesmasContainer label').forEach(label => {
        const text = label.textContent.toLowerCase();
        // Sembunyikan jika tidak cocok dengan kata kunci pencarian
        label.style.display = text.includes(keyword) ? 'flex' : 'none';
      });
    });
  }

  // === FITUR BARU: Pencarian di dalam daftar Checkbox Diagnosa ===
  const searchDiag = document.getElementById('searchDiagnosa');
  if (searchDiag) {
    searchDiag.addEventListener('input', function() {
      const keyword = this.value.toLowerCase();
      document.querySelectorAll('#filterDiagnosaContainer label').forEach(label => {
        const text = label.textContent.toLowerCase();
        label.style.display = text.includes(keyword) ? 'flex' : 'none';
      });
    });
  }

  // Tombol aksi
  document.getElementById('btnResetFilter')?.addEventListener('click', resetAllFilters);
  document.getElementById('btnPrevPage')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  document.getElementById('btnNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
    if (currentPage < totalPages) { currentPage++; renderTable(); }
  });
  document.getElementById('btnExportExcel')?.addEventListener('click', exportToExcel);
}

async function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  showStatus("Membaca dan memilah seluruh sheet Puskesmas, mohon tunggu...", "warning");

  try {
    const result = await ExcelParser.parseFile(file);
    if (result.patients.length > 0) {
      loadNewData(result.patients, `Berhasil memuat ${result.patients.length.toLocaleString('id-ID')} pasien dari ${result.sheetCount} sheet Puskesmas.`);
    } else {
      showStatus("Tidak ditemukan baris pasien yang valid.", "error");
    }
  } catch (err) {
    console.error(err);
    showStatus("Gagal membaca file Excel: " + err.message, "error");
  }
}

function loadNewData(data, message) {
  masterRecords = data;
  const options = FilterEngine.extractFilterOptions(masterRecords);

  // 1. Buat Daftar Checkbox Puskesmas
  const pkmContainer = document.getElementById('filterPuskesmasContainer');
  if (pkmContainer) {
    pkmContainer.innerHTML = ''; 
    options.puskesmasList.forEach(p => {
      pkmContainer.innerHTML += `
        <label class="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded border border-transparent hover:border-slate-200 transition-colors">
          <input type="checkbox" value="${p}" class="pkm-checkbox rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 cursor-pointer">
          <span class="text-slate-700 text-xs font-medium truncate" title="${p}">${p}</span>
        </label>
      `;
    });
    document.querySelectorAll('.pkm-checkbox').forEach(cb => cb.addEventListener('change', triggerFilter));
  }

  // 2. Buat Daftar Checkbox Diagnosa
  const diagContainer = document.getElementById('filterDiagnosaContainer');
  if (diagContainer) {
    diagContainer.innerHTML = ''; 
    options.diagnosaList.forEach(d => {
      diagContainer.innerHTML += `
        <label class="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded border border-transparent hover:border-slate-200 transition-colors">
          <input type="checkbox" value="${d}" class="diag-checkbox rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 cursor-pointer">
          <span class="text-slate-700 text-xs font-medium truncate" title="${d}">${d}</span>
        </label>
      `;
    });
    document.querySelectorAll('.diag-checkbox').forEach(cb => cb.addEventListener('change', triggerFilter));
  }

  triggerFilter();
  showStatus(message, "success");
}

function triggerFilter() {
  const selectedPkm = Array.from(document.querySelectorAll('.pkm-checkbox:checked')).map(cb => cb.value);
  const selectedDiag = Array.from(document.querySelectorAll('.diag-checkbox:checked')).map(cb => cb.value);

  const criteria = {
    puskesmas: selectedPkm, 
    diagnosa:  selectedDiag, // Sekarang menjadi Array pilihan
    usia:      document.getElementById('filterUsia')?.value || 'ALL',
    gender:    document.getElementById('filterGender')?.value || 'ALL',
    nama:      document.getElementById('filterNama')?.value || '',       
    gejala:    document.getElementById('filterGejala')?.value || '',
    alamat:    document.getElementById('filterAlamat')?.value || '',
    startDate: document.getElementById('filterStartDate')?.value || '',
    endDate:   document.getElementById('filterEndDate')?.value || ''
  };

  filteredRecords = FilterEngine.filter(masterRecords, criteria);
  currentPage = 1; 

  updateKPICards();
  AppCharts.update(filteredRecords);
  renderTable();
}

function updateKPICards() {
  const kpiTotal = document.getElementById('kpiTotal');
  if (kpiTotal) kpiTotal.textContent = filteredRecords.length.toLocaleString('id-ID');

  const balita = filteredRecords.filter(r => r.rentangUsia.includes('1-5') || r.rentangUsia.includes('0-1')).length;
  const kpiBalita = document.getElementById('kpiBalita');
  if (kpiBalita) kpiBalita.textContent = balita.toLocaleString('id-ID');

  const lansia = filteredRecords.filter(r => r.rentangUsia.includes('>60')).length;
  const kpiLansia = document.getElementById('kpiLansia');
  if (kpiLansia) kpiLansia.textContent = lansia.toLocaleString('id-ID');

  const j00 = filteredRecords.filter(r => (r.icd && r.icd.includes('J00')) || r.diagnosa.toLowerCase().includes('common cold')).length;
  const kpiJ00 = document.getElementById('kpiJ00');
  if (kpiJ00) kpiJ00.textContent = j00.toLocaleString('id-ID');
}

function renderTable() {
  const tbody = document.getElementById('patientTableBody');
  if (!tbody) return;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filteredRecords.slice(start, end);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400">Tidak ada data pasien yang cocok dengan kriteria filter.</td></tr>`;
  } else {
    tbody.innerHTML = pageData.map((item, idx) => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3 font-medium text-slate-500">${start + idx + 1}</td>
        <td class="p-3"><span class="bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-medium border border-teal-200">${item.puskesmas}</span></td>
        <td class="p-3 font-semibold text-slate-900">${item.nama}</td>
        <td class="p-3 whitespace-nowrap">${item.jk} <br><span class="text-slate-400 text-[11px]">${item.rentangUsia} (${item.umur} Th)</span></td>
        <td class="p-3 max-w-xs truncate" title="${item.keluhan}">${item.keluhan}</td>
        <td class="p-3">
          <span class="font-bold text-teal-700 mr-1">${item.icd}</span>
          <span class="text-slate-600 block text-[11px]">${item.diagnosa}</span>
        </td>
        <td class="p-3 text-slate-600 max-w-xs truncate" title="${item.alamat}">${item.alamat}</td>
        <td class="p-3 text-slate-500 text-[11px]">${item.poli}</td>
      </tr>
    `).join('');
  }

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const pageInfo = document.getElementById('pageInfo');
  if (pageInfo) pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
  
  const summaryText = document.getElementById('tableSummaryText');
  if (summaryText) summaryText.textContent = `Menampilkan ${filteredRecords.length > 0 ? start + 1 : 0} - ${Math.min(end, filteredRecords.length)} dari ${filteredRecords.length.toLocaleString('id-ID')} pasien`;
  
  const btnPrev = document.getElementById('btnPrevPage');
  if (btnPrev) btnPrev.disabled = (currentPage === 1);
  const btnNext = document.getElementById('btnNextPage');
  if (btnNext) btnNext.disabled = (currentPage >= totalPages);
}

function resetAllFilters() {
  document.querySelectorAll('.pkm-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.diag-checkbox').forEach(cb => cb.checked = false);

  if (document.getElementById('searchPuskesmas')) document.getElementById('searchPuskesmas').value = '';
  if (document.getElementById('searchDiagnosa')) document.getElementById('searchDiagnosa').value = '';

  // Tampilkan kembali semua opsi checkbox yang mungkin tersembunyi karena pencarian
  document.querySelectorAll('#filterPuskesmasContainer label, #filterDiagnosaContainer label').forEach(l => l.style.display = 'flex');

  if (document.getElementById('filterUsia')) document.getElementById('filterUsia').value = 'ALL';
  if (document.getElementById('filterGender')) document.getElementById('filterGender').value = 'ALL';
  if (document.getElementById('filterNama')) document.getElementById('filterNama').value = '';
  if (document.getElementById('filterGejala')) document.getElementById('filterGejala').value = '';
  if (document.getElementById('filterAlamat')) document.getElementById('filterAlamat').value = '';
  if (document.getElementById('filterStartDate')) document.getElementById('filterStartDate').value = '';
  if (document.getElementById('filterEndDate')) document.getElementById('filterEndDate').value = '';
  
  triggerFilter();
}

function exportToExcel() {
  if (filteredRecords.length === 0) {
    alert("Tidak ada data untuk diekspor!");
    return;
  }
  let userInputName = prompt("Masukkan nama file Excel untuk diunduh:", "Hasil_Pilih_ISPA");
  if (userInputName === null) return; 

  let fileName = userInputName.trim() !== "" ? userInputName.trim() : "Hasil_Pilih_ISPA";
  if (!fileName.toLowerCase().endsWith('.xlsx')) fileName += '.xlsx';

  const fullRawDataToExport = filteredRecords.map(item => item.rawRowData || item);
  const ws = XLSX.utils.json_to_sheet(fullRawDataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Terpilah Lengkap");
  XLSX.writeFile(wb, fileName);
}

function showStatus(text, type = "info") {
  const banner = document.getElementById('statusBanner');
  const textElem = document.getElementById('statusText');
  const badge = document.getElementById('recordCountBadge');

  if (textElem) textElem.textContent = text;
  if (badge) badge.textContent = `${masterRecords.length.toLocaleString('id-ID')} Data Dimuat`;

  if (banner) {
    banner.className = "px-4 py-2.5 rounded-lg text-sm flex items-center justify-between border " +
      (type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
       type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
       type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
       'bg-blue-50 border-blue-200 text-blue-800');
  }
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}