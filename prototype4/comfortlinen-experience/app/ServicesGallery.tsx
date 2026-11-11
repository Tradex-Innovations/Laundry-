'use client';

import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import ServicesLeaves from './ServicesLeaves';
import './services-gallery.css';

const GalleryCanvas = lazy(() => import('./ServicesGalleryCanvas'));

export type GalleryService = {
  name: string;
  short: string;
  image: string;
  number: string;
};
export type GalleryItem = GalleryService & { index: number };

type Props = {
  services: GalleryService[];
  paused: boolean;
  onSelect: (index: number) => void;
  onEnquire: () => void;
};

const filters = ['All', 'Stays', 'Dining', 'Garment care'];

export default function ServicesGallery({ services, paused, onSelect, onEnquire }: Props) {
  const section = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState('All');
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);
  const onReady = useCallback((success: boolean) => {
    setSupported(success);
    setReady(success);
  }, []);
  const items = useMemo(() => services.map((service, index) => ({ ...service, index })).filter(service =>
    filter === 'All' ||
    (filter === 'Stays' && [0, 2].includes(service.index)) ||
    (filter === 'Dining' && service.index === 1) ||
    (filter === 'Garment care' && service.index === 3)
  ), [services, filter]);

  const selectFilter = (value: string) => {
    setFilter(value);
    if (section.current && section.current.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: section.current.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    }
  };

  return (
    <section ref={section} id="services" className={`services-gallery ${ready ? 'gallery-ready' : ''} ${supported ? '' : 'gallery-fallback'}`} aria-labelledby="services-heading">
      <div className="gallery-stage">
        <div className="gallery-atmosphere" aria-hidden="true" />
        <div className="gallery-heading">
          <h2 id="services-heading">Selected <em>Services</em></h2>
          <div className="gallery-filters" role="group" aria-label="Filter services">
            {filters.map(value => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => selectFilter(value)}>
                {value}<sup>{value === 'All' ? 4 : value === 'Stays' ? 2 : 1}</sup>
              </button>
            ))}
          </div>
        </div>
        {supported && <Suspense fallback={null}>
          <GalleryCanvas items={items} paused={paused} section={section} onSelect={onSelect} onReady={onReady} />
        </Suspense>}
        <ServicesLeaves paused={paused} />
        <div className="gallery-static" aria-hidden={ready} inert={ready}>
          {items.map(item => (
            <button key={item.index} className="gallery-static-card" onClick={() => onSelect(item.index)}>
              <img src={`/media/${item.image}`} alt="" loading="lazy" />
              <span><strong>{item.name}</strong><small>{item.short}</small><ArrowUpRight size={20} /></span>
            </button>
          ))}
        </div>
        <div className="gallery-bottom">
          <span className="gallery-scroll-hint"><ArrowDown size={13} /> SCROLL TO EXPLORE</span>
          <button onClick={onEnquire}>Find your linen service <ArrowUpRight size={15} /></button>
          <a href="#about">Meet ComfortLinen <ArrowDown size={15} /></a>
        </div>
      </div>
    </section>
  );
}
