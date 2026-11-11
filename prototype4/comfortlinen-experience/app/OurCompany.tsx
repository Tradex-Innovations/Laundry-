'use client';

import {useEffect, useRef} from 'react';
import {ArrowDown, ArrowUpRight, Leaf, MapPin, Shirt} from 'lucide-react';
import './our-company.css';

/** Company history and photography adapted from comfortlinen.co.uk/about-us/. */
export default function OurCompany({paused}: {paused: boolean}) {
  const story = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = story.current;
    if (!section) return;
    const photographs = [...section.querySelectorAll<HTMLElement>('.story-photograph')];
    let frame = 0;
    const draw = () => {
      frame = 0;
      if (document.hidden) return;
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (viewport * .7 - rect.top) / (rect.height - viewport * .3)));
      section.style.setProperty('--story-progress', String(progress));
      if (rect.bottom < 0 || rect.top > viewport) return;
      photographs.forEach(photo => {
        const bounds = photo.getBoundingClientRect();
        const offset = paused ? 0 : Math.max(-25, Math.min(25, (viewport * .5 - bounds.top - bounds.height * .5) * .065));
        photo.style.setProperty('--photo-shift', `${offset.toFixed(2)}px`);
      });
    };
    const schedule = () => {if (!frame && !document.hidden) frame = requestAnimationFrame(draw);};
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [paused]);

  return <>
    <section id="about" className="company-about" aria-labelledby="about-heading">
      <div className="about-intro">
        <div className="about-copy" data-reveal>
          <p className="eyebrow">04 / ABOUT US</p>
          <h2 id="about-heading">Care starts<br/>with <em>people.</em></h2>
          <p>We’re ComfortLinen, a linen hire and laundry partner for hotels, restaurants, holiday stays and B&amp;Bs across the South West. From our home in Axminster, we bring together careful finishing, dedicated linen stock and a commitment to using resources thoughtfully.</p>
          <a className="underlined-link" href="#co-founder">Meet our co-founder <ArrowDown size={16}/></a>
        </div>
        <figure className="about-photograph" data-reveal>
          <div><img src="/media/about-comfortlinen.webp" width={980} height={516} alt="The ComfortLinen laundry premises in Axminster" loading="lazy"/></div>
          <figcaption><span>OUR HOME</span><span><MapPin size={12}/> Axminster, Devon</span></figcaption>
        </figure>
      </div>
      <div className="company-principles" aria-label="What matters to us">
        <div data-reveal><Leaf size={22} strokeWidth={1.2}/><h3>A lighter footprint</h3><p>Water recycling, heat recovery and our own electricity generation.</p></div>
        <div data-reveal><Shirt size={22} strokeWidth={1.2}/><h3>Care in the details</h3><p>Quality linen, carefully finished and reserved for your business.</p></div>
        <div data-reveal><MapPin size={22} strokeWidth={1.2}/><h3>Local by nature</h3><p>Collection and delivery across the South West.</p></div>
      </div>
    </section>

    <section id="co-founder" className="company-founder" aria-labelledby="founder-heading">
      <figure className="founder-portrait" data-reveal>
        <img src="/media/co-founder.jpg" width={1000} height={1249} alt="Mr. Gayanath Nanayakkara, co-founder of ComfortLinen" loading="lazy" decoding="async"/>
        <figcaption><span>Mr. Gayanath Nanayakkara</span><span>Co-founder, ComfortLinen</span></figcaption>
      </figure>
      <div className="founder-copy" data-reveal>
        <p className="eyebrow">THE PEOPLE BEHIND THE CARE</p>
        <h2 id="founder-heading">From Galle.<br/><em>With purpose.</em></h2>
        <div className="founder-journey"><span>Galle, Sri Lanka</span><ArrowUpRight size={15} aria-hidden="true"/><span>Axminster, United Kingdom</span></div>
        <p>Mr. Gayanath Nanayakkara’s journey began in Galle, Sri Lanka, where life close to the coast and nature shaped a lasting respect for the world around him. He carried that outlook to the UK, bringing the values of his roots to a new chapter.</p>
        <p>As co-founder of ComfortLinen, he has helped build a linen hire and laundry business serving hospitality across the South West. From Sri Lankan beginnings to a business in Axminster, his journey reflects an ambition to move forward with purpose: dependable care for customers and a more thoughtful use of resources.</p>
        <a className="underlined-link" href="#story">Follow our journey <ArrowDown size={16}/></a>
      </div>
    </section>

    <section ref={story} id="story" className="company-story" aria-labelledby="story-heading">
      <div className="story-sticky">
        <p className="eyebrow">05 / OUR STORY</p>
        <h2 id="story-heading">Different shores.<br/><em>The same care.</em></h2>
        <p>Our story began with an appreciation for nature. It still shapes the way we work.</p>
        <div className="story-route" aria-hidden="true"><span>Galle, Sri Lanka</span><i><b/></i><span>Axminster, Devon</span></div>
        <a className="underlined-link" href="#inside-comfortlinen">Step inside our laundry <ArrowDown size={16}/></a>
      </div>
      <ol className="story-chapters">
        <li id="story-roots">
          <figure className="story-photograph"><img src="/media/story-galle.webp" width={723} height={547} alt="Palm trees and turquoise water on Sri Lanka’s southern coastline" loading="lazy"/><figcaption>01 / WHERE IT BEGAN</figcaption></figure>
          <div className="story-chapter-copy" data-reveal><span className="eyebrow">GALLE, SRI LANKA</span><h3>A respect for nature.</h3><p>Growing up near Galle’s coast and wilderness taught us to make the most of what we had. Reusing coconut shells for ironing was one early lesson in resourcefulness.</p></div>
        </li>
        <li id="story-today">
          <figure className="story-photograph"><img src="/media/story-laundry.webp" width={980} height={743} alt="Solar panels being installed on the ComfortLinen laundry roof" loading="lazy"/><figcaption>02 / THE JOURNEY CONTINUES</figcaption></figure>
          <div className="story-chapter-copy" data-reveal><span className="eyebrow">AXMINSTER, DEVON</span><h3>A purpose carried forward.</h3><p>Moving to Axminster brought that outlook to a new purpose: caring for linen and the environment. Today, our laundry generates electricity, uses hydrogen-ready boilers, recycles water and recovers heat.</p><a className="underlined-link" href="#care">Explore our approach <ArrowUpRight size={15}/></a></div>
        </li>
      </ol>
    </section>
  </>;
}
