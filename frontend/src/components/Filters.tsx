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
    <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
      <div className="relative w-full lg:max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15 group-focus-within:text-[#8B1A32]/60 transition-colors duration-300" size={16} />
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar taller..."
          aria-label="Buscar taller"
          className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl h-11 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-[#8B1A32]/20 focus:bg-white/[0.05] transition-all duration-200 placeholder:text-white/15"
        />
      </div>

      <div className="flex flex-wrap gap-2 w-full lg:flex-1 justify-start lg:justify-end">
        <button 
          type="button"
          onClick={() => setCategory('')} 
          className={cn(
            "px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 border",
            category === '' 
              ? "bg-white/[0.06] text-white border-white/[0.08]" 
              : "bg-transparent border-transparent text-white/35 hover:bg-white/[0.03] hover:text-white/70"
          )}
        >
          Todos
        </button>
        {Object.entries(CATEGORIA_LABEL).map(([val, label]) => (
          <button 
            type="button"
            key={val}
            onClick={() => setCategory(val)}
            className={cn(
              "px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 border",
              category === val 
                ? "bg-white/[0.06] text-white border-white/[0.08]" 
                : "bg-transparent border-transparent text-white/35 hover:bg-white/[0.03] hover:text-white/70"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
