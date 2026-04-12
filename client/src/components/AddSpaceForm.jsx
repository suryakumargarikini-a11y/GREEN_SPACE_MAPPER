import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Loader2, MapPin, LocateFixed, Image, Trees,
    CheckSquare, Square, X, Send
} from 'lucide-react';

const FACILITIES = [
    { id: 'playground', label: 'Playground', emoji: '🛝' },
    { id: 'walking_track', label: 'Walking Track', emoji: '🚶' },
    { id: 'garden', label: 'Garden', emoji: '🌸' },
    { id: 'benches', label: 'Benches', emoji: '🪑' },
    { id: 'sports_area', label: 'Sports Area', emoji: '⚽' },
];

/**
 * AddSpaceForm – complete form for adding a new green space.
 * Uploads data as multipart/form-data.
 * Props: darkMode
 */
export default function AddSpaceForm({ darkMode }) {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        lat: '',
        lng: '',
        area: '',
        description: '',
        facilities: [],
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [locating, setLocating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ── Geolocation auto-fill ────────────────────────────────────────────────
    const useMyLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm((prev) => ({
                    ...prev,
                    lat: pos.coords.latitude.toFixed(6),
                    lng: pos.coords.longitude.toFixed(6),
                }));
                setLocating(false);
            },
            () => {
                setError('Unable to retrieve your location. Please enter coordinates manually.');
                setLocating(false);
            }
        );
    }, []);

    // ── Image picker with compression preview ────────────────────────────────
    const handleImageChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    }, []);

    // ── Facility toggle ──────────────────────────────────────────────────────
    const toggleFacility = (id) => {
        setForm((prev) => {
            const has = prev.facilities.includes(id);
            return {
                ...prev,
                facilities: has ? prev.facilities.filter((f) => f !== id) : [...prev.facilities, id],
            };
        });
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name || !form.lat || !form.lng) {
            setError('Name, Latitude and Longitude are required.');
            return;
        }
        setSaving(true);
        try {
            const data = new FormData();
            data.append('name', form.name);
            data.append('lat', form.lat);
            data.append('lng', form.lng);
            data.append('area', form.area);
            data.append('description', form.description);
            data.append('facilities', JSON.stringify(form.facilities));
            if (imageFile) data.append('image', imageFile);

            const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
            await axios.post(`${API_BASE}/api/spaces`, data);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = `w-full px-3 py-2.5 rounded-xl border text-sm transition-all duration-150
    ${darkMode
            ? 'bg-[#0a1a0e] border-green-900/50 text-green-100 placeholder:text-green-800'
            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
        }
    focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20`;

    const labelClass = `block text-xs font-semibold uppercase tracking-wide mb-1.5
    ${darkMode ? 'text-green-400' : 'text-green-700'}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 fade-up">

            {/* Error alert */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">
                    <X size={16} />
                    {error}
                    <button type="button" onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {/* Name */}
            <div>
                <label className={labelClass}>Space Name *</label>
                <input
                    type="text"
                    placeholder="e.g. Central City Park"
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
            </div>

            {/* Coordinates */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass.replace('mb-1.5', '')}>Coordinates *</label>
                    <button
                        type="button"
                        onClick={useMyLocation}
                        disabled={locating}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-500 hover:text-green-400 disabled:opacity-50 transition-colors">
                        {locating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
                        Use My Location
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-green-700 mb-1 block">Latitude</label>
                        <input type="number" step="any" placeholder="e.g. 28.6139"
                            className={inputClass} value={form.lat}
                            onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-green-700 mb-1 block">Longitude</label>
                        <input type="number" step="any" placeholder="e.g. 77.2090"
                            className={inputClass} value={form.lng}
                            onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
                    </div>
                </div>
            </div>

            {/* Area */}
            <div>
                <label className={labelClass}>Area Size</label>
                <input type="text" placeholder="e.g. 5 acres or 2 hectares"
                    className={inputClass} value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>

            {/* Description */}
            <div>
                <label className={labelClass}>Description</label>
                <textarea rows={3} placeholder="Describe this green space..."
                    className={`${inputClass} resize-none`} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Facilities */}
            <div>
                <label className={labelClass}>Facilities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FACILITIES.map((f) => {
                        const active = form.facilities.includes(f.id);
                        return (
                            <button
                                type="button"
                                key={f.id}
                                onClick={() => toggleFacility(f.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150
                    ${active
                                        ? 'bg-green-500 border-green-500 text-white shadow'
                                        : darkMode
                                            ? 'bg-green-900/20 border-green-900/50 text-green-400 hover:border-green-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-green-300'
                                    }`}>
                                {active ? <CheckSquare size={15} /> : <Square size={15} />}
                                {f.emoji} {f.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Photo upload */}
            <div>
                <label className={labelClass}>Photo</label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150
            ${imagePreview
                        ? 'p-2 border-green-400'
                        : darkMode
                            ? 'border-green-900/50 hover:border-green-700 bg-green-900/10'
                            : 'border-gray-200 hover:border-green-300 bg-gray-50'
                    }`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    {imagePreview ? (
                        <div className="relative w-full">
                            <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-lg" />
                            <button type="button" onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); }}
                                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Image size={32} className={`mb-2 ${darkMode ? 'text-green-700' : 'text-gray-300'}`} />
                            <p className={`text-sm ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>Click to upload photo</p>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-green-800' : 'text-gray-300'}`}>JPG, PNG, WEBP up to 10MB</p>
                        </>
                    )}
                </label>
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            bg-green-500 hover:bg-green-600 text-white font-semibold text-base
            shadow-lg shadow-green-500/30 transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {saving ? 'Saving...' : 'Add Green Space'}
            </button>
        </form>
    );
}
