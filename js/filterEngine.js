/**
 * =============================================================================
 * MODULE: FILTER ENGINE (filterEngine.js)
 * =============================================================================
 */

const FilterEngine = {
  filter: function(masterData, criteria) {
    const { puskesmas, diagnosa, usia, gender, gejala, alamat, nama, startDate, endDate } = criteria;

    const lowerNama   = String(nama || '').toLowerCase().trim();
    const lowerGejala = String(gejala || '').toLowerCase().trim();
    const lowerAlamat = String(alamat || '').toLowerCase().trim();

    return masterData.filter(item => {
      // 1. Filter Multi-Choice: Puskesmas
      if (puskesmas && puskesmas.length > 0) {
        if (!puskesmas.includes(item.puskesmas)) return false;
      }

      // 2. Filter Multi-Choice: Diagnosa
      if (diagnosa && diagnosa.length > 0) {
        if (!diagnosa.includes(item.diagnosa)) return false;
      }

      // 3. Filter Dropdown Biasa
      if (usia !== 'ALL' && item.rentangUsia !== usia) return false;
      if (gender !== 'ALL' && String(item.jk || '').toLowerCase() !== gender.toLowerCase()) return false;
      
      // 4. Filter Tanggal (Kalender)
      if (startDate && item.tanggal && item.tanggal < startDate) return false;
      if (endDate && item.tanggal && item.tanggal > endDate) return false;

      // 5. Filter Input Teks (Pencarian)
      const teksNama = String(item.nama || '').toLowerCase();
      const teksKeluhan = String(item.keluhan || '').toLowerCase();
      const teksAlamat = String(item.alamat || '').toLowerCase();

      if (lowerNama && !teksNama.includes(lowerNama)) return false;
      if (lowerGejala && !teksKeluhan.includes(lowerGejala)) return false;
      if (lowerAlamat && !teksAlamat.includes(lowerAlamat)) return false;

      return true;
    });
  },

  extractFilterOptions: function(masterData) {
    const pkmSet = new Set();
    const diagSet = new Set();
    
    masterData.forEach(d => {
      if (d.puskesmas) pkmSet.add(d.puskesmas);
      if (d.diagnosa && d.diagnosa !== '-') diagSet.add(d.diagnosa);
    });
    
    return {
      puskesmasList: Array.from(pkmSet).sort(),
      diagnosaList: Array.from(diagSet).sort()
    };
  }
};