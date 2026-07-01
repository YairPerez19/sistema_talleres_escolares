import { CATEGORIA_LABEL } from '../lib/talleres';
import { cn } from '../lib/utils';
import { Search } from '@/components/AnimatedIcons';

interface FiltersProps {
  category: string;
  setCategory: (c: string) => void;
  search: string;
  setSearch: (s: string) => void;
}

export function Filters({ category, setCategory, search, setSearch }: FiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-center">
      {/* Search Bar */}
      <div className="relative w-full lg:max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/60 transition-colors" size={16} />
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar taller, instructor, lugar..."
          className="w-full bg-white/5 border border-white/5 rounded-full h-11 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:border-white/10 focus:bg-white/10 transition-all placeholder:text-white/20"
        />
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2 w-full lg:flex-1 justify-start lg:justify-end">
        <button 
          onClick={() => setCategory('')} 
          className={cn(
            "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all border",
            category === '' ? "bg-white/10 text-white border-white/10" : "bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white/80"
          )}
        >
          Todos
        </button>
        {Object.entries(CATEGORIA_LABEL).map(([val, label]) => (
          <button 
            key={val}
            onClick={() => setCategory(val)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all border",
              category === val ? "bg-white/10 text-white border-white/10" : "bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white/80"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
