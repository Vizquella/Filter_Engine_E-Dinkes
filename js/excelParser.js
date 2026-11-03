/**
 * =============================================================================
 * MODULE: EXCEL PARSER (excelParser.js) - Versi Atribut Lengkap & Cerdas
 * =============================================================================
 */

const ExcelParser = {
  wilayahMap: [],

  initWilayahData: async function() {
    try {
      const response = await fetch('data/wilayah_pkm.json');
      if (!response.ok) throw new Error("File wilayah_pkm.json tidak ditemukan");
      this.wilayahMap = await response.json();
    } catch (err) {
      this.wilayahMap = [];
    }
  },

  normalizePuskesmasName: function(name) {
    if (!name) return 'Lainnya / Tidak Terpetakan';
    let clean = name.trim().toLowerCase();
    clean = clean.replace(/\s+/g, ' ');
    return clean.replace(/\b\w/g, l => l.toUpperCase());
  },

  matchPuskesmas: function(kelurahanPasien, alamatPasien, rawPkm, sheetName) {
    if (rawPkm && rawPkm !== '-' && !rawPkm.toLowerCase().includes('total')) {
      return this.normalizePuskesmasName(rawPkm);
    }

    const genericSheets = ['sheet', 'data', 'rekap', 'master', 'table'];
    const isGeneric = genericSheets.some(g => sheetName.toLowerCase().includes(g));
    if (!isGeneric && sheetName && sheetName.trim() !== '') {
      return this.normalizePuskesmasName(sheetName);
    }

    const teksLokasi = `${kelurahanPasien || ''} ${alamatPasien || ''}`.toLowerCase();
    if (this.wilayahMap.length > 0) {
      const matched = this.wilayahMap.find(item => 
        item.kelurahan && teksLokasi.includes(item.kelurahan.toLowerCase())
      );
      if (matched) {
        return this.normalizePuskesmasName(matched.puskesmas);
      }
    }

    return 'Lainnya / Tidak Terpetakan';
  },

  parseFile: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const allPatients = [];

          workbook.SheetNames.forEach(sheetName => {
            if (sheetName.toLowerCase().includes('pkm') || sheetName.toLowerCase().includes('rekap')) {
              return;
            }

            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            if (rows.length < 2) return;

            let headerIdx = -1;
            for (let i = 0; i < Math.min(10, rows.length); i++) {
              const rowStr = rows[i].join(' ').toLowerCase();
              if (rowStr.includes('nama pasien') || rowStr.includes('icd')) {
                headerIdx = i;
                break;
              }
            }

            if (headerIdx === -1) return;
            const headers = rows[headerIdx].map(h => String(h).trim());

            const idxPuskesmas = this._findColIndex(headers, ['nama puskesmas', 'puskesmas']);
            const idxTanggal   = this._findColIndex(headers, ['tanggal']);
            const idxNama      = this._findColIndex(headers, ['nama pasien', 'pasien', 'nama']);
            const idxJK        = this._findColIndex(headers, ['jenis kelamin', 'jk', 'kelamin']);
            const idxUmur      = this._findColIndex(headers, ['umur tahun', 'umur']);
            const idxRentang   = this._findColIndex(headers, ['rentang usia', 'kelompok usia']);
            const idxKeluhan   = this._findColIndex(headers, ['keluhan utama', 'keluhan', 'keluhan tambahan']);
            const idxICD       = this._findColIndex(headers, ['icd-x 1', 'icd-x', 'icd 1', 'icd']);
            const idxDiagnosa  = this._findColIndex(headers, ['diagnosa 1', 'diagnosa']);
            const idxAlamat    = this._findColIndex(headers, ['alamat']);
            const idxKelurahan = this._findColIndex(headers, ['kelurahan', 'desa']);
            const idxPoli      = this._findColIndex(headers, ['poli/ruangan', 'poli', 'ruangan']);

            for (let r = headerIdx + 1; r < rows.length; r++) {
              const row = rows[r];
              const nama = row[idxNama];

              if (!nama || String(nama).trim() === '' || String(nama).toLowerCase().includes('total')) {
                continue;
              }

              const rawPkm = String(row[idxPuskesmas] || '').trim();
              const kelurahan = String(row[idxKelurahan] || '').trim();
              const alamat = String(row[idxAlamat] || '').trim();
              const puskesmasFinal = this.matchPuskesmas(kelurahan, alamat, rawPkm, sheetName);

              // Parsing Tanggal Secara Cerdas
              let rawDate = row[idxTanggal];
              let formattedDate = '';
              
              if (rawDate) {
                if (typeof rawDate === 'number') {
                  const dateObj = XLSX.SSF.parse_date_code(rawDate);
                  formattedDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
                } else {
                  let strDate = String(rawDate).trim().slice(0, 10); 
                  if (strDate.match(/^\d{2}[-/]\d{2}[-/]\d{4}$/)) {
                    let parts = strDate.replace(/\//g, '-').split('-'); 
                    formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                  } else {
                    formattedDate = strDate;
                  }
                }
              }

              // Perhitungan Rentang Usia Otomatis
              let umurRaw = row[idxUmur];
              let umurAngka = parseInt(umurRaw) || 0;
              let rentangUsiaVal = String(row[idxRentang] || '').trim();

              if (!rentangUsiaVal || rentangUsiaVal === '-' || rentangUsiaVal === 'Tidak Diketahui') {
                if (umurAngka <= 1) {
                  rentangUsiaVal = '0-1 Tahun';
                } else if (umurAngka <= 5) {
                  rentangUsiaVal = '1-5 Tahun';
                } else if (umurAngka <= 18) {
                  rentangUsiaVal = '5-18 Tahun';
                } else if (umurAngka <= 59) {
                  rentangUsiaVal = '18-59 Tahun';
                } else {
                  rentangUsiaVal = '>60 Tahun';
                }
              }

              // Simpan objek terstruktur UNTUK DASHBOARD + simpan baris asli MENTAH UNTUK EKSPOR LENGKAP
              const rawObj = {};
              headers.forEach((h, idx) => {
                if (h) rawObj[h] = row[idx];
              });
              // Timpa/pastikan kolom Puskesmas menggunakan hasil deteksi rapi
              if (idxPuskesmas !== -1) rawObj[headers[idxPuskesmas]] = puskesmasFinal;

              allPatients.push({
                puskesmas:   puskesmasFinal,
                tanggal:     formattedDate || '2026-09-01',
                nama:        String(nama).trim(),
                jk:          String(row[idxJK] || '-').trim(),
                umur:        String(umurRaw || '-').trim(),
                rentangUsia: rentangUsiaVal, 
                keluhan:     String(row[idxKeluhan] || '-').trim(),
                icd:         String(row[idxICD] || '-').trim(),
                diagnosa:    String(row[idxDiagnosa] || '-').trim(),
                alamat:      alamat || kelurahan || '-',
                poli:        String(row[idxPoli] || '-').trim(),
                rawRowData:  rawObj // Menyimpan seluruh atribut kolom mentah asli aslinya disini!
              });
            }
          });

          resolve({ patients: allPatients, sheetCount: workbook.SheetNames.length });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.readAsArrayBuffer(file);
    });
  },

  _findColIndex: function(headers, keywords) {
    for (let k of keywords) {
      const idx = headers.findIndex(h => h.toLowerCase() === k.toLowerCase());
      if (idx !== -1) return idx;
    }
    for (let k of keywords) {
      const idx = headers.findIndex(h => h.toLowerCase().includes(k.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  }
};