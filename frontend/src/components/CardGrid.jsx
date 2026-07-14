import { memo } from 'react';
import { Play } from 'lucide-react';

function CardGrid({ title, items, variant = 'square', onActivate }) {
  if (!items?.length) {
    return null;
  }

  const isArtist = variant === 'circle';

  return (
    <section className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
      
      <div
        className="flex flex-wrap gap-4"
      >
        {items.map((item) => (
          <article
            key={item.id}
            className={`group cursor-pointer transition-all duration-200 ${
              isArtist
                ? 'w-[84px] sm:w-[92px] md:w-[100px]'
                : 'w-[120px] sm:w-[132px] md:w-[148px]'
            }`}
            role="button"
            tabIndex={0}
            onClick={() => onActivate?.(item.title)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onActivate?.(item.title);
              }
            }}
          >
            {/* Image Container */}
            <div 
              className={`relative mb-2 overflow-hidden transition-all duration-200 group-hover:shadow-[0_4px_10px_rgba(15,23,42,0.12)] ${
                isArtist 
                  ? 'aspect-square rounded-full' 
                  : 'aspect-square rounded-xl'
              }`}
            >
              <img 
                src={item.image} 
                alt={item.title} 
                loading="lazy" 
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" 
              />
              
              {/* Play overlay - appears on hover */}
              <div className="absolute inset-0 grid place-items-center bg-slate-900/0 transition-all duration-200 group-hover:bg-slate-900/35">
                <Play 
                  size={20} 
                  className="text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" 
                  fill="white" 
                />
              </div>
            </div>

            {/* Text Info */}
            <div className="min-w-0 px-0.5">
              <p className="truncate text-sm font-medium text-slate-900 leading-tight">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {item.subtitle}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default memo(CardGrid);
