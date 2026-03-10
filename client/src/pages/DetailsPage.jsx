import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import {
    ArrowLeft, Loader2, Trees, AlertCircle,
    MapPin, Ruler, Edit, Trash2
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const FACILITY_ICONS = {
    playground: { emoji: '🛝', color: '#f59e0b' },
    walking_track: { emoji: '🚶', color: '#3b82f6' },
    garden: { emoji: '🌸', color: '#22c55e' },
    benches: { emoji: '🪑', color: '#8b5cf6' },
    sports_area: { emoji: '⚽', color: '#ef4444' },
};

export default function DetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [space, setSpace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const [darkMode, setDarkMode] = useState(() => document.body.classList.contains('dark'));
    useEffect(() => {
        const obs = new MutationObserver(() => setDarkMode(document.body.classList.contains('dark')));
        obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    // ── Fetch space by id ────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`/api/spaces/${id}`);
                setSpace(data);
            } catch {
                setError('Could not load this green space.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    // ── Delete handler ───────────────────────────────────────────────────────
    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/api/spaces/${id}`);
            navigate('/');
        } catch {
            setError('Failed to delete. Please try again.');
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const base = darkMode ? 'bg-[#0a0f0d] text-green-100' : 'bg-green-50 text-gray-900';
    const card = darkMode ? 'bg-[#111a14] border-green-900/40' : 'bg-white border-green-100';

    if (loading) return (
        <div className={`flex-1 flex items-center justify-center ${base}`}>
            <Loader2 size={36} className="text-green-500 animate-spin" />
        </div>
    );

    if (error || !space) return (
        <div className={`flex-1 flex flex-col items-center justify-center gap-4 ${base}`}>
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-base">{error || 'Space not found.'}</p>
            <Link to="/" className="text-green-500 hover:underline text-sm">← Back to Map</Link>
        </div>
    );

    return (
        <div className={`min-h-screen ${base} pb-16`}>
            <div className="max-w-3xl mx-auto px-4 pt-6">
                {/* Back */}
                <Link to="/"
                    className={`inline-flex items-center gap-1.5 text-sm font-medium mb-5 transition-colors
              ${darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-700 hover:text-green-500'}`}>
                    <ArrowLeft size={15} /> Back to Map
                </Link>

                {/* Hero image */}
                <div className={`rounded-2xl overflow-hidden shadow-lg border mb-6 ${card}`}>
                    {space.imageUrl ? (
                        <img src={space.imageUrl} alt={space.name} loading="lazy"
                            className="w-full h-64 sm:h-80 object-cover" />
                    ) : (
                        <div className="w-full h-48 sm:h-64 flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                            <Trees size={64} className="text-green-300" />
                        </div>
                    )}

                    <div className="p-5 sm:p-7">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h1 className="text-2xl sm:text-3xl font-bold">{space.name}</h1>
                            <div className="flex gap-2 flex-shrink-0">
                                <Link to={`/add?edit=${space._id}`}
                                    className={`p-2 rounded-xl border transition-colors
                      ${darkMode ? 'border-green-800 text-green-400 hover:bg-green-900/40' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                    <Edit size={16} />
                                </Link>
                                {!confirmDelete ? (
                                    <button onClick={() => setConfirmDelete(true)}
                                        className="p-2 rounded-xl border border-red-300/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleDelete} disabled={deleting}
                                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60">
                                            {deleting ? 'Deleting…' : 'Confirm'}
                                        </button>
                                        <button onClick={() => setConfirmDelete(false)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border
                          ${darkMode ? 'border-green-800 text-green-400' : 'border-gray-200 text-gray-500'}`}>
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Meta */}
                        <div className={`flex flex-wrap gap-4 mb-4 text-sm
                ${darkMode ? 'text-green-400' : 'text-gray-500'}`}>
                            <span className="flex items-center gap-1.5">
                                <MapPin size={14} />
                                {space.location.lat.toFixed(4)}, {space.location.lng.toFixed(4)}
                            </span>
                            {space.area && (
                                <span className="flex items-center gap-1.5"><Ruler size={14} />{space.area}</span>
                            )}
                        </div>

                        {/* Description */}
                        {space.description && (
                            <p className={`text-sm leading-relaxed mb-5 ${darkMode ? 'text-green-300/80' : 'text-gray-600'}`}>
                                {space.description}
                            </p>
                        )}

                        {/* Facilities */}
                        {space.facilities.length > 0 && (
                            <div>
                                <h2 className={`text-xs font-bold uppercase tracking-widest mb-2.5
                    ${darkMode ? 'text-green-600' : 'text-gray-400'}`}>
                                    Facilities
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {space.facilities.map((f) => {
                                        const info = FACILITY_ICONS[f] || { emoji: '📍', color: '#6b7280' };
                                        return (
                                            <span key={f}
                                                style={{ background: info.color + '18', color: info.color, border: `1px solid ${info.color}44` }}
                                                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium capitalize">
                                                <span>{info.emoji}</span>
                                                {f.replace('_', ' ')}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mini map */}
                <div className={`rounded-2xl overflow-hidden shadow border ${card}`}>
                    <div className={`px-5 py-3 border-b ${darkMode ? 'border-green-900/40' : 'border-gray-100'}`}>
                        <h2 className={`text-sm font-semibold ${darkMode ? 'text-green-300' : 'text-gray-700'}`}>
                            📍 Location on Map
                        </h2>
                    </div>
                    <div className="h-60">
                        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                            <Map
                                mapId="details-map"
                                center={space.location}
                                zoom={15}
                                gestureHandling="cooperative"
                                disableDefaultUI
                                className="w-full h-full"
                            >
                                <AdvancedMarker position={space.location}>
                                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg ring-4 ring-green-300/40">
                                        <Trees size={20} className="text-white" />
                                    </div>
                                </AdvancedMarker>
                            </Map>
                        </APIProvider>
                    </div>
                </div>
            </div>
        </div>
    );
}
