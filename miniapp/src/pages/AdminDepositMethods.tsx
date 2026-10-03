import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { ArrowLeft, Plus, Edit2, Trash2, UploadCloud, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DepositMethod {
  id: string;
  type: 'cbe' | 'boa' | 'telebirr' | 'mpesa';
  name: string;
  account_number: string;
  logo_url: string;
  min_deposit: number;
  is_active: boolean;
}

const methodNames = {
  cbe: 'Commercial Bank of Ethiopia',
  boa: 'Bank of Abyssinia',
  telebirr: 'Telebirr',
  mpesa: 'M-Pesa',
};

export default function AdminDepositMethods() {
  const { user } = useGameStore();
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    type: 'cbe',
    name: '',
    account_number: '',
    min_deposit: 50,
  });
  const [file, setFile] = useState<File | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/admin/deposit-methods`, {
        headers: { 'x-telegram-init-data': initData }
      });
      if (res.ok) {
        const data = await res.json();
        setMethods(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ type: 'cbe', name: '', account_number: '', min_deposit: 50 });
    setFile(null);
    setExistingLogoUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (method: DepositMethod) => {
    setEditingId(method.id);
    setFormData({
      type: method.type,
      name: method.name,
      account_number: method.account_number,
      min_deposit: method.min_deposit,
    });
    setFile(null);
    setExistingLogoUrl(method.logo_url || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deposit method?')) return;
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/admin/deposit-methods/${id}`, {
        method: 'DELETE',
        headers: { 'x-telegram-init-data': initData }
      });
      if (res.ok) fetchMethods();
    } catch (err) {
      console.error(err);
    }
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    // 1. Get presigned URL
    const res = await fetch(`${API_URL}/upload/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
      body: JSON.stringify({ filename: file.name, contentType: file.type })
    });
    const { uploadUrl, publicUrl } = await res.json();
    
    // 2. Upload to Cloudflare R2
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });
    
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let finalLogoUrl = existingLogoUrl;
      
      // Upload new file to R2 if selected
      if (file) {
        finalLogoUrl = await uploadLogo(file);
      }
      
      const payload = { ...formData, logo_url: finalLogoUrl, is_active: true };
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      
      const url = editingId 
        ? `${API_URL}/admin/deposit-methods/${editingId}`
        : `${API_URL}/admin/deposit-methods`;
        
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchMethods();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role !== 'admin') return <div className="p-10 text-center">Admin only!</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 rounded-b-2xl shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <Link to="/admin" className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-bold text-slate-800 text-lg">Deposit Methods</h1>
        <button onClick={openNewModal} className="p-2 bg-yellow-400 text-yellow-950 rounded-full hover:bg-yellow-500 shadow-sm">
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      {/* List of Methods */}
      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-center text-slate-500 mt-10">Loading...</p>
        ) : methods.length === 0 ? (
          <p className="text-center text-slate-500 mt-10">No deposit methods found. Add one!</p>
        ) : (
          methods.map((method) => (
            <div key={method.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {method.logo_url ? (
                  <img src={method.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">No Img</div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800">{methodNames[method.type]}</h3>
                  <p className="text-xs text-slate-500 font-medium">{method.name}</p>
                  <p className="text-sm font-bold text-slate-600 tracking-wide">{method.account_number}</p>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <button onClick={() => openEditModal(method)} className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(method.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 text-lg">{editingId ? 'Edit Method' : 'Add New Method'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">METHOD TYPE</label>
                <select 
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                >
                  <option value="cbe">Commercial Bank of Ethiopia</option>
                  <option value="boa">Bank of Abyssinia</option>
                  <option value="telebirr">Telebirr</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ACCOUNT NAME</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Abebe Kebede"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ACCOUNT / PHONE NUMBER</label>
                <input 
                  type="text" 
                  required
                  placeholder={formData.type === 'cbe' || formData.type === 'boa' ? '1000123456789' : '0911234567'}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">MIN DEPOSIT (ETB)</label>
                <input 
                  type="number" 
                  required
                  min="50"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
                  value={formData.min_deposit}
                  onChange={(e) => setFormData({...formData, min_deposit: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">LOGO IMAGE</label>
                <div className="flex items-center space-x-3">
                  <label className="flex-1 bg-blue-50 text-blue-600 px-4 py-3 rounded-xl text-center font-bold text-sm cursor-pointer border border-blue-100 flex justify-center items-center space-x-2 hover:bg-blue-100">
                    <UploadCloud size={18} />
                    <span>Choose File</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  {(file || existingLogoUrl) && (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-gray-200 flex-shrink-0">
                      <img 
                        src={file ? URL.createObjectURL(file) : existingLogoUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 mt-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? <span>Saving...</span> : <><Save size={18} /> <span>Save Method</span></>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
