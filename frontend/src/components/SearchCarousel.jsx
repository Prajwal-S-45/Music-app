import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export default function SearchCarousel({ title, count, showViewAll, expanded, onToggleViewAll, children }) {
  const scrollRef = useRef(null);

  const handleScroll = useCallback((direction) => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  return (
    <motion.section variants={sectionVariants} className="search-section search-carousel-section">
      <div className="search-section-header">
        <div>
          <h2>{title}</h2>
          {typeof count === 'number' && <span>{count} result{count === 1 ? '' : 's'}</span>}
        </div>
        
        <div className="search-section-actions">
          {showViewAll && (
            <button type="button" className="search-view-all" onClick={onToggleViewAll}>
              {expanded ? 'Show Less' : 'View All'}
            </button>
          )}
          <div className="search-carousel-nav">
            <button type="button" className="carousel-nav-btn" onClick={() => handleScroll('left')} aria-label="Scroll left">
              <ChevronLeft size={22} />
            </button>
            <button type="button" className="carousel-nav-btn" onClick={() => handleScroll('right')} aria-label="Scroll right">
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="search-horizontal-row carousel-hide-scrollbar" ref={scrollRef}>
        {children}
      </div>
    </motion.section>
  );
}
