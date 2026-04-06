import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import '../styles/planner.css';

/* ─────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────── */
const TABS = [
  { id: 'trips',     icon: '🗺️',  label: 'My Trips' },
  { id: 'itinerary', icon: '📍',  label: 'Itinerary' },
  { id: 'budget',    icon: '💰',  label: 'Budget' },
  { id: 'packing',   icon: '🎒',  label: 'Packing List' },
  { id: 'members',   icon: '👥',  label: 'Members' },
];

const TRIP_TYPES = [
  { value: 'luar-kota',   label: 'Vetting Luar Kota' },
  { value: 'jabodetabek',  label: 'Vetting Jabodetabek' },
];

const DEFAULT_PACKING = {
  'Dokumen': { icon: '📄', bg: 'rgba(79,142,247,0.15)', items: [
    'Surat Tugas', 'Formulir Vetting', 'ID Karyawan', 'Daftar Checklist Survey'
  ]},
  'Elektronik': { icon: '📱', bg: 'rgba(139,92,246,0.15)', items: [
    'Laptop', 'Charger HP', 'Power Bank', 'Kamera (opsional)'
  ]},
  'Kebutuhan Pribadi': { icon: '🧳', bg: 'rgba(52,211,153,0.15)', items: [
    'Pakaian ganti', 'Obat-obatan pribadi', 'Masker', 'Hand sanitizer'
  ]},
};

const AVATAR_COLORS = [
  'linear-gradient(135deg,#6477f0,#8b5cf6)',
  'linear-gradient(135deg,#4f8ef7,#6477f0)',
  'linear-gradient(135deg,#f472b6,#a78bfa)',
  'linear-gradient(135deg,#34d399,#4f8ef7)',
  'linear-gradient(135deg,#fbbf24,#f472b6)',
  'linear-gradient(135deg,#a78bfa,#34d399)',
];

const BUDGET_ICONS = ['🏨', '🚗', '🍽️', '✈️', '🎫', '📦', '💊', '🛒'];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}
function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
export default function SurveyPlannerPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('trips');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── All trips from API
  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);

  // ── Save debounce ref
  const saveTimerRef = useRef(null);

  // ── Modal states
  const [showTripModal, setShowTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [tripForm, setTripForm] = useState({ name: '', type: 'luar-kota', startDate: '', endDate: '' });

  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState(null);
  const [itineraryForm, setItineraryForm] = useState({ employeeName: '', address: '', coordinates: '', time: '', day: 1 });

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ name: '', amount: '', category: '🏨' });

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', jabatan: '', divisi: '' });

  const [showVettingModal, setShowVettingModal] = useState(false);
  const [vettingForm, setVettingForm] = useState({ employeeId: '', deadline: '' });

  const [editingBudgetTotal, setEditingBudgetTotal] = useState(false);
  const [budgetTotalInput, setBudgetTotalInput] = useState('');

  // ── Load trips from API
  const loadTrips = useCallback(async () => {
    try {
      const data = await api.get('/trips');
      setTrips(data);
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
    api.get('/employees').then(setEmployees).catch(() => {});
  }, [loadTrips]);

  // ── Active trip
  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId), [trips, activeTripId]);

  // Set first trip active if none selected
  useEffect(() => {
    if (!activeTripId && trips.length > 0) {
      setActiveTripId(trips[0].id);
    }
  }, [trips, activeTripId]);

  /* ═══════════ HELPER: save trip to API (debounced) ═══════════ */
  const saveTripToAPI = useCallback(async (tripId, data) => {
    try {
      await api.put(`/trips/${tripId}`, data);
    } catch (err) {
      console.error('Auto-save failed:', err);
      toast.error('Gagal menyimpan perubahan');
    }
  }, [toast]);

  // Debounced save for sub-item changes (itinerary, budget, packing, members, vetting)
  const debouncedSave = useCallback((tripId, data) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTripToAPI(tripId, data);
    }, 500);
  }, [saveTripToAPI]);

  /* ═══════════ HELPER: update active trip locally + save to API ═══════════ */
  const updateActiveTrip = useCallback((updater) => {
    setTrips(prev => {
      const updated = prev.map(t => {
        if (t.id !== activeTripId) return t;
        const newTrip = updater(t);
        // Debounced save to API
        debouncedSave(activeTripId, {
          itinerary: newTrip.itinerary,
          budget: newTrip.budget,
          packing: newTrip.packing,
          members: newTrip.members,
          vettingTargets: newTrip.vettingTargets,
        });
        return newTrip;
      });
      return updated;
    });
  }, [activeTripId, debouncedSave]);

  /* ═══════════════════ TRIP CRUD ═══════════════════ */
  const handleSaveTrip = async () => {
    if (!tripForm.name.trim()) {
      toast.error('Nama trip wajib diisi');
      return;
    }
    try {
      if (editingTrip) {
        const updated = await api.put(`/trips/${editingTrip.id}`, {
          name: tripForm.name,
          type: tripForm.type,
          startDate: tripForm.startDate || null,
          endDate: tripForm.endDate || null,
        });
        setTrips(prev => prev.map(t => t.id === editingTrip.id ? updated : t));
        toast.success('Trip diperbarui');
      } else {
        const newTrip = await api.post('/trips', {
          name: tripForm.name,
          type: tripForm.type,
          startDate: tripForm.startDate || null,
          endDate: tripForm.endDate || null,
          packing: DEFAULT_PACKING,
        });
        setTrips(prev => [newTrip, ...prev]);
        setActiveTripId(newTrip.id);
        toast.success('Trip baru berhasil dibuat');
      }
      setShowTripModal(false);
      setEditingTrip(null);
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan trip');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      await api.delete(`/trips/${tripId}`);
      setTrips(prev => prev.filter(t => t.id !== tripId));
      if (activeTripId === tripId) setActiveTripId(null);
      toast.success('Trip dihapus');
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus trip');
    }
  };

  const openEditTrip = (trip) => {
    setEditingTrip(trip);
    setTripForm({
      name: trip.name,
      type: trip.type,
      startDate: trip.start_date || trip.startDate || '',
      endDate: trip.end_date || trip.endDate || '',
    });
    setShowTripModal(true);
  };

  const openNewTrip = () => {
    setEditingTrip(null);
    setTripForm({ name: '', type: 'luar-kota', startDate: '', endDate: '' });
    setShowTripModal(true);
  };

  /* ═══════════════ ITINERARY CRUD ═══════════════ */
  const handleSaveItinerary = () => {
    if (!itineraryForm.employeeName.trim()) {
      toast.error('Nama karyawan wajib diisi');
      return;
    }
    const item = { ...itineraryForm, id: editingItinerary?.id || generateId() };
    updateActiveTrip(trip => {
      let list = [...(trip.itinerary || [])];
      if (editingItinerary) {
        list = list.map(i => i.id === editingItinerary.id ? item : i);
      } else {
        list.push(item);
      }
      return { ...trip, itinerary: list };
    });
    setShowItineraryModal(false);
    setEditingItinerary(null);
    toast.success(editingItinerary ? 'Itinerary diperbarui' : 'Karyawan vetting ditambahkan');
  };

  const deleteItinerary = (id) => {
    updateActiveTrip(trip => ({ ...trip, itinerary: trip.itinerary.filter(i => i.id !== id) }));
    toast.success('Item dihapus');
  };

  const openNewItinerary = () => {
    setEditingItinerary(null);
    setItineraryForm({ employeeName: '', address: '', coordinates: '', time: '', day: 1 });
    setShowItineraryModal(true);
  };
  const openEditItinerary = (item) => {
    setEditingItinerary(item);
    setItineraryForm({ ...item });
    setShowItineraryModal(true);
  };

  /* ═══════════════ BUDGET CRUD ═══════════════ */
  const handleSaveBudget = () => {
    if (!budgetForm.name.trim() || !budgetForm.amount) {
      toast.error('Nama dan jumlah wajib diisi');
      return;
    }
    const item = { ...budgetForm, id: generateId(), amount: Number(budgetForm.amount) };
    updateActiveTrip(trip => ({
      ...trip,
      budget: { ...trip.budget, items: [...trip.budget.items, item] }
    }));
    setShowBudgetModal(false);
    toast.success('Budget ditambahkan');
  };

  const deleteBudget = (id) => {
    updateActiveTrip(trip => ({
      ...trip,
      budget: { ...trip.budget, items: trip.budget.items.filter(i => i.id !== id) }
    }));
    toast.success('Budget dihapus');
  };

  const handleSaveBudgetTotal = () => {
    const val = Number(budgetTotalInput);
    if (isNaN(val)) { toast.error('Angka tidak valid'); return; }
    updateActiveTrip(trip => ({
      ...trip,
      budget: { ...trip.budget, total: val }
    }));
    setEditingBudgetTotal(false);
    toast.success('Total budget diperbarui');
  };

  /* ═══════════════ PACKING CRUD ═══════════════ */
  const togglePackingItem = (catName, index) => {
    updateActiveTrip(trip => {
      const packing = JSON.parse(JSON.stringify(trip.packing));
      if (!packing[catName]._checked) packing[catName]._checked = {};
      packing[catName]._checked[index] = !packing[catName]._checked[index];
      return { ...trip, packing };
    });
  };

  const addPackingItem = (catName, text) => {
    if (!text.trim()) return;
    updateActiveTrip(trip => {
      const packing = JSON.parse(JSON.stringify(trip.packing));
      packing[catName].items.push(text.trim());
      return { ...trip, packing };
    });
  };

  const removePackingItem = (catName, index) => {
    updateActiveTrip(trip => {
      const packing = JSON.parse(JSON.stringify(trip.packing));
      packing[catName].items.splice(index, 1);
      if (packing[catName]._checked) {
        delete packing[catName]._checked[index];
        const newChecked = {};
        Object.keys(packing[catName]._checked).forEach(k => {
          const ki = Number(k);
          if (ki > index) newChecked[ki - 1] = packing[catName]._checked[k];
          else if (ki < index) newChecked[ki] = packing[catName]._checked[k];
        });
        packing[catName]._checked = newChecked;
      }
      return { ...trip, packing };
    });
  };

  /* ═══════════════ MEMBER CRUD ═══════════════ */
  const handleSaveMember = () => {
    if (!memberForm.name.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }
    const member = { ...memberForm, id: generateId() };
    updateActiveTrip(trip => ({
      ...trip,
      members: [...(trip.members || []), member]
    }));
    setShowMemberModal(false);
    toast.success('Anggota ditambahkan');
  };

  const removeMember = (id) => {
    updateActiveTrip(trip => ({
      ...trip,
      members: trip.members.filter(m => m.id !== id)
    }));
    toast.success('Anggota dihapus');
  };

  /* ═══════════════ VETTING TARGET CRUD ═══════════════ */
  const handleSaveVetting = () => {
    const emp = employees.find(e => String(e.id) === String(vettingForm.employeeId));
    if (!emp) { toast.error('Pilih karyawan'); return; }
    if (!vettingForm.deadline) { toast.error('Tentukan deadline'); return; }
    const target = {
      id: generateId(),
      employeeId: emp.id,
      name: emp.name,
      department: emp.department || '-',
      position: emp.position || '-',
      deadline: vettingForm.deadline,
    };
    updateActiveTrip(trip => ({
      ...trip,
      vettingTargets: [...(trip.vettingTargets || []), target]
    }));
    setShowVettingModal(false);
    toast.success('Target vetting ditambahkan');
  };

  const removeVetting = (id) => {
    updateActiveTrip(trip => ({
      ...trip,
      vettingTargets: trip.vettingTargets.filter(v => v.id !== id)
    }));
    toast.success('Target vetting dihapus');
  };

  /* ═══════════════════════════════════════════
     TAB BADGES
     ═══════════════════════════════════════════ */
  const tabBadges = useMemo(() => {
    if (!activeTrip) return {};
    return {
      itinerary: activeTrip.itinerary?.length || 0,
      budget: activeTrip.budget?.items?.length || 0,
      members: (activeTrip.members?.length || 0) + (activeTrip.vettingTargets?.length || 0),
    };
  }, [activeTrip]);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="planner-v2" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'2rem',marginBottom:'12px'}}>🗺️</div>
          <p style={{color:'var(--text-dim)',fontSize:'14px'}}>Memuat data planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="planner-v2">
      {/* Page Header */}
      <div className="page-header">
        <div className="title-area">
          <div className="title-icon">🗺️</div>
          <div>
            <h1>Survey Planner</h1>
            <p className="subtitle">Rencanakan perjalanan vetting karyawan</p>
          </div>
        </div>
        <button className="btn-new-trip" onClick={openNewTrip}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
          Buat Trip Baru
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
            {tabBadges[tab.id] > 0 && <span className="tab-badge">{tabBadges[tab.id]}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'trips' && <TripsTab trips={trips} activeTripId={activeTripId} onSelect={id => { setActiveTripId(id); setActiveTab('itinerary'); }} onEdit={openEditTrip} onDelete={handleDeleteTrip} />}
      {activeTab === 'itinerary' && <ItineraryTab trip={activeTrip} onAdd={openNewItinerary} onEdit={openEditItinerary} onDelete={deleteItinerary} />}
      {activeTab === 'budget' && <BudgetTab trip={activeTrip} onAddBudget={() => { setBudgetForm({ name:'', amount:'', category:'🏨' }); setShowBudgetModal(true); }} onDeleteBudget={deleteBudget} editingTotal={editingBudgetTotal} budgetTotalInput={budgetTotalInput} onStartEditTotal={() => { setBudgetTotalInput(String(activeTrip?.budget?.total || 0)); setEditingBudgetTotal(true); }} onChangeTotalInput={setBudgetTotalInput} onSaveTotal={handleSaveBudgetTotal} onCancelTotal={() => setEditingBudgetTotal(false)} />}
      {activeTab === 'packing' && <PackingTab trip={activeTrip} onToggle={togglePackingItem} onAdd={addPackingItem} onRemove={removePackingItem} />}
      {activeTab === 'members' && <MembersTab trip={activeTrip} onAddMember={() => { setMemberForm({ name:'', jabatan:'', divisi:'' }); setShowMemberModal(true); }} onRemoveMember={removeMember} onAddVetting={() => { setVettingForm({ employeeId:'', deadline:'' }); setShowVettingModal(true); }} onRemoveVetting={removeVetting} />}

      {/* ═══ MODALS ═══ */}

      {/* Trip Modal */}
      {showTripModal && (
        <div className="modal-overlay" onClick={() => setShowTripModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTrip ? '✏️ Edit Trip' : '🗺️ Buat Trip Baru'}</h3>
              <button className="btn-close-modal" onClick={() => setShowTripModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Trip</label>
                <input className="form-input" value={tripForm.name} onChange={e => setTripForm(f => ({...f, name: e.target.value}))} placeholder="Contoh: Vetting Surabaya Q1" />
              </div>
              <div className="form-group">
                <label className="form-label">Tipe Perjalanan</label>
                <select className="form-select" value={tripForm.type} onChange={e => setTripForm(f => ({...f, type: e.target.value}))}>
                  {TRIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tanggal Mulai</label>
                  <input className="form-input" type="date" value={tripForm.startDate} onChange={e => setTripForm(f => ({...f, startDate: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Selesai</label>
                  <input className="form-input" type="date" value={tripForm.endDate} onChange={e => setTripForm(f => ({...f, endDate: e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setShowTripModal(false)}>Batal</button>
              <button className="btn-action primary" onClick={handleSaveTrip}>{editingTrip ? 'Simpan Perubahan' : '🗺️ Buat Trip'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Itinerary Modal */}
      {showItineraryModal && (
        <div className="modal-overlay" onClick={() => setShowItineraryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItinerary ? '✏️ Edit Itinerary' : '➕ Tambah Karyawan Yang Mau di Vetting'}</h3>
              <button className="btn-close-modal" onClick={() => setShowItineraryModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Karyawan</label>
                <input className="form-input" value={itineraryForm.employeeName} onChange={e => setItineraryForm(f => ({...f, employeeName: e.target.value}))} placeholder="Nama karyawan yang akan di-vetting" />
              </div>
              <div className="form-group">
                <label className="form-label">Alamat</label>
                <input className="form-input" value={itineraryForm.address} onChange={e => setItineraryForm(f => ({...f, address: e.target.value}))} placeholder="Alamat lengkap lokasi vetting" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Titik Koordinat Lokasi</label>
                  <input className="form-input" value={itineraryForm.coordinates} onChange={e => setItineraryForm(f => ({...f, coordinates: e.target.value}))} placeholder="-6.200000, 106.816666" />
                </div>
                <div className="form-group">
                  <label className="form-label">Jam</label>
                  <input className="form-input" type="time" value={itineraryForm.time} onChange={e => setItineraryForm(f => ({...f, time: e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Hari Ke-</label>
                <select className="form-select" value={itineraryForm.day} onChange={e => setItineraryForm(f => ({...f, day: Number(e.target.value)}))}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i+1} value={i+1}>Hari {i+1}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setShowItineraryModal(false)}>Batal</button>
              <button className="btn-action primary" onClick={handleSaveItinerary}>{editingItinerary ? 'Simpan' : '➕ Tambah'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="modal-overlay" onClick={() => setShowBudgetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Tambah Budget</h3>
              <button className="btn-close-modal" onClick={() => setShowBudgetModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <input className="form-input" value={budgetForm.name} onChange={e => setBudgetForm(f => ({...f, name: e.target.value}))} placeholder="Contoh: Hotel 2 malam" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jumlah (Rupiah)</label>
                  <input className="form-input" type="number" value={budgetForm.amount} onChange={e => setBudgetForm(f => ({...f, amount: e.target.value}))} placeholder="500000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="form-select" value={budgetForm.category} onChange={e => setBudgetForm(f => ({...f, category: e.target.value}))}>
                    {BUDGET_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setShowBudgetModal(false)}>Batal</button>
              <button className="btn-action primary" onClick={handleSaveBudget}>➕ Tambah Budget</button>
            </div>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Tambah Anggota</h3>
              <button className="btn-close-modal" onClick={() => setShowMemberModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama</label>
                <input className="form-input" value={memberForm.name} onChange={e => setMemberForm(f => ({...f, name: e.target.value}))} placeholder="Nama anggota tim" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jabatan</label>
                  <input className="form-input" value={memberForm.jabatan} onChange={e => setMemberForm(f => ({...f, jabatan: e.target.value}))} placeholder="Contoh: Surveyor" />
                </div>
                <div className="form-group">
                  <label className="form-label">Divisi</label>
                  <input className="form-input" value={memberForm.divisi} onChange={e => setMemberForm(f => ({...f, divisi: e.target.value}))} placeholder="Contoh: HRD" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setShowMemberModal(false)}>Batal</button>
              <button className="btn-action primary" onClick={handleSaveMember}>👤 Tambah Anggota</button>
            </div>
          </div>
        </div>
      )}

      {/* Vetting Target Modal */}
      {showVettingModal && (
        <div className="modal-overlay" onClick={() => setShowVettingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎯 Tambah Target Vetting</h3>
              <button className="btn-close-modal" onClick={() => setShowVettingModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Pilih Karyawan (dari Database)</label>
                <select className="form-select" value={vettingForm.employeeId} onChange={e => setVettingForm(f => ({...f, employeeId: e.target.value}))}>
                  <option value="" disabled>-- Pilih Karyawan --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.department || '-'} / {emp.position || '-'}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Deadline Date</label>
                <input className="form-input" type="date" value={vettingForm.deadline} onChange={e => setVettingForm(f => ({...f, deadline: e.target.value}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setShowVettingModal(false)}>Batal</button>
              <button className="btn-action primary" onClick={handleSaveVetting}>🎯 Tambah Target</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   SUB-COMPONENTS (Tab Panels)
   ───────────────────────────────────────────────────── */

/* ═══════ 1. MY TRIPS TAB ═══════ */
function TripsTab({ trips, activeTripId, onSelect, onEdit, onDelete }) {
  if (trips.length === 0) {
    return (
      <div className="section-card">
        <div className="empty-state">
          <div className="empty-icon">🗺️</div>
          <h3>Belum ada trip</h3>
          <p>Klik tombol "Buat Trip Baru" di atas untuk memulai perencanaan perjalanan vetting kamu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="card-header">
        <h2>📋 Daftar Trip</h2>
        <span className="count-pill">{trips.length} Trip</span>
      </div>
      <div className="trips-grid">
        {trips.map(trip => {
          const startDate = trip.start_date || trip.startDate;
          const endDate = trip.end_date || trip.endDate;
          return (
            <div key={trip.id} className={`trip-card ${activeTripId === trip.id ? 'active' : ''}`} onClick={() => onSelect(trip.id)}>
              <div className="trip-top">
                <span className={`trip-type-badge ${trip.type}`}>
                  {trip.type === 'luar-kota' ? '✈️ Luar Kota' : '🚗 Jabodetabek'}
                </span>
              </div>
              <div className="trip-title">{trip.name}</div>
              <div className="trip-date">
                {startDate ? `${startDate}` : 'Tanggal belum diset'}
                {endDate ? ` → ${endDate}` : ''}
              </div>
              <div className="trip-stats">
                <div className="trip-stat">
                  <span className="trip-stat-val">{trip.itinerary?.length || 0}</span>
                  <span className="trip-stat-lbl">Karyawan</span>
                </div>
                <div className="trip-stat">
                  <span className="trip-stat-val">{trip.members?.length || 0}</span>
                  <span className="trip-stat-lbl">Anggota</span>
                </div>
                <div className="trip-stat">
                  <span className="trip-stat-val">{trip.budget?.items?.length || 0}</span>
                  <span className="trip-stat-lbl">Budget</span>
                </div>
              </div>
              <div className="trip-actions">
                <button className="trip-action-btn" onClick={(e) => { e.stopPropagation(); onEdit(trip); }} title="Edit">✏️</button>
                <button className="trip-action-btn delete" onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }} title="Hapus">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════ 2. ITINERARY TAB ═══════ */
function ItineraryTab({ trip, onAdd, onEdit, onDelete }) {
  if (!trip) {
    return <NoTripState tab="Itinerary" />;
  }

  const sorted = [...(trip.itinerary || [])].sort((a, b) => (a.day || 1) - (b.day || 1));

  return (
    <div className="section-card">
      <div className="card-header">
        <h2>📍 Daftar Karyawan Vetting</h2>
        <button className="btn-action primary" onClick={onAdd}>➕ Tambah Karyawan Yang Mau di Vetting</button>
      </div>
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📍</div>
          <h3>Belum ada itinerary</h3>
          <p>Tambahkan karyawan yang akan di-vetting pada trip ini.</p>
        </div>
      ) : (
        <div className="itinerary-list">
          {sorted.map((item) => (
            <div key={item.id} className="itinerary-item">
              <div className="day-badge">
                <span style={{fontSize:'9px',opacity:0.7}}>HARI</span>
                <span className="day-num">{item.day || 1}</span>
              </div>
              <div className="itinerary-info">
                <div className="itinerary-name">{item.employeeName}</div>
                {item.address && <div className="itinerary-address">📍 {item.address}</div>}
                <div className="itinerary-meta">
                  {item.time && <span className="meta-chip">🕐 {item.time}</span>}
                  {item.coordinates && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.coordinates)}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="meta-chip-link"
                    >
                      <span className="meta-chip">🌐 {item.coordinates}</span>
                    </a>
                  )}
                </div>
              </div>
              <div className="item-actions">
                <button className="item-action-btn" onClick={() => onEdit(item)} title="Edit">✏️</button>
                <button className="item-action-btn delete" onClick={() => onDelete(item.id)} title="Hapus">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════ 3. BUDGET TAB ═══════ */
function BudgetTab({ trip, onAddBudget, onDeleteBudget, editingTotal, budgetTotalInput, onStartEditTotal, onChangeTotalInput, onSaveTotal, onCancelTotal }) {
  if (!trip) return <NoTripState tab="Budget" />;

  const totalBudget = trip.budget?.total || 0;
  const totalSpent = (trip.budget?.items || []).reduce((sum, i) => sum + (i.amount || 0), 0);
  const remaining = totalBudget - totalSpent;

  return (
    <div className="section-card">
      <div className="card-header">
        <h2>💰 Anggaran Trip</h2>
        <button className="btn-action primary" onClick={onAddBudget}>➕ Tambah Budget</button>
      </div>

      <div className="budget-summary">
        <div className="budget-stat">
          <div className="stat-label">Total Budget</div>
          {editingTotal ? (
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
              <input className="form-input" type="number" value={budgetTotalInput} onChange={e => onChangeTotalInput(e.target.value)} style={{padding:'6px 10px',fontSize:'16px',fontWeight:800,width:'150px',background:'var(--surface)',border:'1px solid var(--purple)',borderRadius:'8px',color:'var(--text)'}} autoFocus />
              <button className="btn-action primary" onClick={onSaveTotal} style={{padding:'6px 12px',fontSize:'11px'}}>✓</button>
              <button className="btn-action" onClick={onCancelTotal} style={{padding:'6px 10px',fontSize:'11px'}}>✕</button>
            </div>
          ) : (
            <div className="stat-value editable" onClick={onStartEditTotal} title="Klik untuk edit total budget">
              {formatRupiah(totalBudget)}
            </div>
          )}
        </div>
        <div className="budget-stat">
          <div className="stat-label">Total Terpakai</div>
          <div className="stat-value red">{formatRupiah(totalSpent)}</div>
        </div>
        <div className="budget-stat">
          <div className="stat-label">Sisa Budget</div>
          <div className={`stat-value ${remaining >= 0 ? 'green' : 'red'}`}>{formatRupiah(remaining)}</div>
        </div>
      </div>

      {(trip.budget?.items || []).length === 0 ? (
        <div className="empty-state" style={{padding:'30px 20px'}}>
          <div className="empty-icon">💸</div>
          <p>Belum ada item budget. Klik "Tambah Budget" untuk menambahkan.</p>
        </div>
      ) : (
        <div className="budget-list">
          {trip.budget.items.map((item, idx) => (
            <div key={item.id || idx} className="budget-item">
              <div className="budget-icon" style={{background: idx % 2 === 0 ? 'var(--purple-light)' : 'var(--green-light)'}}>
                {item.category || '💰'}
              </div>
              <div className="budget-desc">
                <div className="budget-desc-title">{item.name}</div>
                <div className="budget-desc-sub">Item #{idx + 1}</div>
              </div>
              <div className="budget-amount" style={{color:'var(--accent)'}}>{formatRupiah(item.amount)}</div>
              <button className="btn-action danger" onClick={() => onDeleteBudget(item.id)} style={{padding:'4px 8px',fontSize:'11px'}}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════ 4. PACKING LIST TAB ═══════ */
function PackingTab({ trip, onToggle, onAdd, onRemove }) {
  const [newItemTexts, setNewItemTexts] = useState({});

  if (!trip) return <NoTripState tab="Packing List" />;

  const packing = trip.packing || {};

  return (
    <div className="section-card">
      <div className="card-header">
        <h2>🎒 Packing List</h2>
        {(() => {
          let total = 0, checked = 0;
          Object.entries(packing).forEach(([, cat]) => {
            total += cat.items?.length || 0;
            if (cat._checked) checked += Object.values(cat._checked).filter(Boolean).length;
          });
          return <span className="count-pill">{checked}/{total} Selesai</span>;
        })()}
      </div>
      <div className="packing-categories">
        {Object.entries(packing).map(([catName, cat]) => {
          const checkedCount = cat._checked ? Object.values(cat._checked).filter(Boolean).length : 0;
          return (
            <div key={catName} className="packing-category">
              <div className="cat-header">
                <div className="cat-icon" style={{background: cat.bg || 'var(--purple-light)'}}>{cat.icon || '📦'}</div>
                <div className="cat-title">{catName}</div>
                <div className="cat-count">{checkedCount}/{cat.items?.length || 0}</div>
              </div>
              {(cat.items || []).map((item, idx) => {
                const isChecked = cat._checked?.[idx];
                return (
                  <div key={idx} className="packing-item">
                    <div className={`check-box ${isChecked ? 'checked' : ''}`} onClick={() => onToggle(catName, idx)}>
                      {isChecked ? '✓' : ''}
                    </div>
                    <span className={`packing-text ${isChecked ? 'checked' : ''}`}>{item}</span>
                    <button className="packing-remove" onClick={() => onRemove(catName, idx)}>✕</button>
                  </div>
                );
              })}
              <div className="add-packing-row">
                <input
                  placeholder={`Tambah item ke ${catName}...`}
                  value={newItemTexts[catName] || ''}
                  onChange={e => setNewItemTexts(prev => ({ ...prev, [catName]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onAdd(catName, newItemTexts[catName] || '');
                      setNewItemTexts(prev => ({ ...prev, [catName]: '' }));
                    }
                  }}
                />
                <button onClick={() => {
                  onAdd(catName, newItemTexts[catName] || '');
                  setNewItemTexts(prev => ({ ...prev, [catName]: '' }));
                }}>+ Tambah</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════ 5. MEMBERS TAB ═══════ */
function MembersTab({ trip, onAddMember, onRemoveMember, onAddVetting, onRemoveVetting }) {
  if (!trip) return <NoTripState tab="Members" />;

  return (
    <div className="section-card">
      <div className="card-header">
        <h2>👥 Anggota Tim</h2>
        <button className="btn-action primary" onClick={onAddMember}>👤 Tambah Anggota</button>
      </div>

      {(trip.members || []).length === 0 ? (
        <div className="empty-state" style={{padding:'30px 20px'}}>
          <div className="empty-icon">👥</div>
          <p>Belum ada anggota tim. Tambahkan surveyor atau anggota yang akan ikut trip.</p>
        </div>
      ) : (
        <div className="members-grid">
          {trip.members.map((member, idx) => (
            <div key={member.id || idx} className="member-card">
              <div className="member-avatar" style={{background: AVATAR_COLORS[idx % AVATAR_COLORS.length]}}>
                {initials(member.name)}
              </div>
              <div className="member-name">{member.name}</div>
              <div className="member-role">{member.jabatan || '-'} · {member.divisi || '-'}</div>
              <button className="member-remove" onClick={() => onRemoveMember(member.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="vetting-section">
        <h3>
          🎯 Karyawan Yang Harus Di Vetting
          <button className="btn-action primary" onClick={onAddVetting} style={{marginLeft:'auto',fontSize:'11px',padding:'6px 12px'}}>
            + Tambah dari Database
          </button>
        </h3>

        {(trip.vettingTargets || []).length === 0 ? (
          <div className="empty-state" style={{padding:'20px'}}>
            <p style={{fontSize:'12px'}}>Belum ada target vetting. Tambahkan dari database karyawan.</p>
          </div>
        ) : (
          <div className="vetting-list">
            {trip.vettingTargets.map((vet, idx) => (
              <div key={vet.id || idx} className="vetting-item">
                <div className="vet-avatar" style={{background: AVATAR_COLORS[idx % AVATAR_COLORS.length]}}>
                  {initials(vet.name)}
                </div>
                <div className="vet-info">
                  <div className="vet-name">{vet.name}</div>
                  <div className="vet-dept">{vet.position} · {vet.department}</div>
                </div>
                <div className="vet-deadline">📅 {vet.deadline}</div>
                <button className="vet-remove" onClick={() => onRemoveVetting(vet.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════ NO TRIP PLACEHOLDER ═══════ */
function NoTripState({ tab }) {
  return (
    <div className="section-card">
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>Pilih Trip Terlebih Dahulu</h3>
        <p>Buka tab "My Trips" dan pilih atau buat trip baru untuk melihat {tab}.</p>
      </div>
    </div>
  );
}
