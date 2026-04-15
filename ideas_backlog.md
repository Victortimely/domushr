# DomusHR Ideas Backlog

Daftar ide pengembangan dan peningkatan UX untuk DomusHR di masa mendatang.

## UI/UX Improvements

### 1. Premium Logout Transition
**Status**: Pending (Saved for later)
**Deskripsi**: 
Menambahkan transisi halus saat logout untuk memberikan feedback visual yang lebih baik. Saat ini logout terjadi secara instan, yang terasa kurang "premium" dibanding aplikasi lain.

**Rencana Implementasi**:
- Tambahkan status `loggingOut` di `AuthContext`.
- Buat overlay pemuatan (*loading overlay*) di `App.jsx` yang muncul saat `loggingOut` bernilai true.
- Tambahkan jeda buatan (*artificial delay*) sekitar 800ms - 1000ms di fungsi `logout` sebelum menghapus state user.
- Gunakan animasi CSS `fade-out` untuk memperhalus perpindahan ke halaman Login.

**File Terkait**:
- `src/context/AuthContext.jsx`
- `src/App.jsx`
- `src/index.css`
