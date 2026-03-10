import AddSpaceForm from '../components/AddSpaceForm';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Leaf } from 'lucide-react';

export default function AddSpacePage() {
    const [darkMode, setDarkMode] = useState(() => document.body.classList.contains('dark'));
    useEffect(() => {
        const obs = new MutationObserver(() => setDarkMode(document.body.classList.contains('dark')));
        obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    return (
        <div className={`min-h-screen py-10 px-4 ${darkMode ? 'bg-[#0a0f0d]' : 'bg-green-50'}`}>
            <div className="max-w-xl mx-auto">
                {/* Back link */}
                <Link to="/"
                    className={`inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors
              ${darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-700 hover:text-green-500'}`}>
                    <ArrowLeft size={15} /> Back to Map
                </Link>

                {/* Card */}
                <div className={`rounded-2xl shadow-xl overflow-hidden border
            ${darkMode ? 'bg-[#111a14] border-green-900/40' : 'bg-white border-green-100'}`}>

                    {/* Header banner */}
                    <div className="relative h-24 bg-gradient-to-br from-green-500 to-emerald-600 flex items-end px-6 pb-4">
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/leaves.png")' }} />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <Leaf size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Add Green Space</h1>
                                <p className="text-green-100 text-xs">Help your community discover nature</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-6">
                        <AddSpaceForm darkMode={darkMode} />
                    </div>
                </div>
            </div>
        </div>
    );
}
