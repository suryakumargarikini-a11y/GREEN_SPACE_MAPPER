import { Link, useLocation } from 'react-router-dom';
import { Leaf, Sun, Moon, Plus, Map, Search, BarChart2 } from 'lucide-react';

export default function Navbar({ darkMode, toggleDark }) {
    const { pathname } = useLocation();

    return (
        <nav className={`sticky top-0 z-50 h-16 flex items-center px-4 lg:px-8 gap-4
        border-b shadow-sm
        ${darkMode
                ? 'bg-[#111a14]/90 border-green-900/40 backdrop-blur-md'
                : 'bg-white/90 border-green-100 backdrop-blur-md'
            }`}>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 mr-auto">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 text-white shadow">
                    <Leaf size={16} strokeWidth={2.5} />
                </span>
                <span className={`font-bold text-base tracking-tight hidden sm:block
            ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                    Green Space Mapper
                </span>
            </Link>

            {/* Nav links */}
            <NavLink to="/" active={pathname === '/'} dark={darkMode} icon={<Map size={15} />}>
                Map
            </NavLink>
            <NavLink to="/explore" active={pathname === '/explore'} dark={darkMode} icon={<Search size={15} />}>
                Search
            </NavLink>
            <NavLink to="/analyzer" active={pathname === '/analyzer'} dark={darkMode} icon={<BarChart2 size={15} />}>
                Analyzer
            </NavLink>
            <NavLink to="/add" active={pathname === '/add'} dark={darkMode}
                icon={<Plus size={15} />}
                highlight>
                Add Space
            </NavLink>

            {/* Dark mode toggle */}
            <button
                onClick={toggleDark}
                aria-label="Toggle dark mode"
                className={`ml-2 p-2 rounded-full transition-all duration-200
            ${darkMode
                        ? 'bg-green-900/50 text-yellow-300 hover:bg-green-800'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}>
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
        </nav>
    );
}

function NavLink({ to, active, dark, icon, children, highlight }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
          ${highlight
                    ? 'bg-green-500 text-white hover:bg-green-600 shadow'
                    : active
                        ? dark
                            ? 'bg-green-900/60 text-green-300'
                            : 'bg-green-100 text-green-700'
                        : dark
                            ? 'text-green-400 hover:bg-green-900/40'
                            : 'text-green-700 hover:bg-green-50'
                }`}>
            {icon}
            {children}
        </Link>
    );
}
