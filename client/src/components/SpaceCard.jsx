import { Trees, MapPin, Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';

// Facility color map
const FACILITY_COLORS = {
    playground: '#f59e0b',
    walking_track: '#3b82f6',
    garden: '#22c55e',
    benches: '#8b5cf6',
    sports_area: '#ef4444',
};

/**
 * SpaceCard – compact card shown in the sidebar list.
 * Props:
 *   space       – the space object
 *   distance    – optional string e.g. "1.2 km"
 *   onClick     – called when card is clicked (zooms map)
 *   isSelected  – highlights the card
 *   darkMode    – boolean
 */
export default function SpaceCard({ space, distance, onClick, isSelected, darkMode }) {
    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            className={`group relative flex gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200
          fade-up border
          ${isSelected
                    ? darkMode
                        ? 'bg-green-900/50 border-green-500/60 shadow-md'
                        : 'bg-green-50 border-green-400 shadow-md'
                    : darkMode
                        ? 'bg-[#111a14] border-green-900/30 hover:border-green-700/50 hover:bg-green-900/20'
                        : 'bg-white border-gray-100 hover:border-green-200 hover:shadow-sm'
                }`}>

            {/* Thumbnail */}
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-green-100">
                {space.imageUrl ? (
                    <img
                        src={space.imageUrl}
                        alt={space.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-green-100">
                        <Trees size={26} className="text-green-400" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                    <h4 className={`font-semibold text-sm leading-tight truncate
              ${darkMode ? 'text-green-100' : 'text-gray-900'}`}>
                        {space.name}
                    </h4>
                    {distance && (
                        <span className="flex-shrink-0 text-xs text-green-500 font-medium">{distance}</span>
                    )}
                </div>

                {space.area && (
                    <div className={`flex items-center gap-1 mt-0.5 text-xs
              ${darkMode ? 'text-green-400/70' : 'text-gray-400'}`}>
                        <Ruler size={10} />
                        {space.area}
                    </div>
                )}

                {/* Facility chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {space.facilities.slice(0, 3).map((f) => {
                        const color = FACILITY_COLORS[f] || '#6b7280';
                        return (
                            <span key={f}
                                style={{ background: color + '18', color, border: `1px solid ${color}33` }}
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize">
                                {f.replace('_', ' ')}
                            </span>
                        );
                    })}
                    {space.facilities.length > 3 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                ${darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-50 text-green-600'}`}>
                            +{space.facilities.length - 3}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
