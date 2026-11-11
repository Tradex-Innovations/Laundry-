'use client';

import {useEffect, useRef, useState} from 'react';
import {SkipForward} from 'lucide-react';
import './landing-intro.css';

/** A short, automatically completing wash cycle while the landscape prepares. */
export default function LandingIntro({ready, onComplete}: {ready: boolean; onComplete: () => void}) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [maximumElapsed, setMaximumElapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const reduced = useRef(false);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const focus = requestAnimationFrame(() => skip.current?.focus({preventScroll: true}));
    const minimum = setTimeout(() => setMinimumElapsed(true), reduced.current ? 300 : 2400);
    const maximum = setTimeout(() => setMaximumElapsed(true), reduced.current ? 500 : 4500);
    return () => {cancelAnimationFrame(focus); clearTimeout(minimum); clearTimeout(maximum);};
  }, []);

  useEffect(() => {
    if (!minimumElapsed || (!ready && !maximumElapsed)) return;
    const transition = requestAnimationFrame(() => setLeaving(true));
    const complete = setTimeout(onComplete, reduced.current ? 120 : 650);
    return () => {cancelAnimationFrame(transition); clearTimeout(complete);};
  }, [minimumElapsed, maximumElapsed, ready, onComplete]);

  return <div className={`landing-intro ${leaving ? 'intro-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="ComfortLinen opening animation">
    <div className="intro-header">
      <img src="/brand/comfortlinen-green.png" alt="ComfortLinen LTD" width={2172} height={724}/>
      <button ref={skip} onClick={onComplete}>Skip animation <SkipForward size={13}/></button>
    </div>
    <div className="intro-centre">
      <div className="machine-scene" aria-hidden="true">
        <div className="machine-ground"/>
        <div className="washing-machine">
          <div className="machine-controls"><span className="machine-drawer"/><span className="machine-display"><i/> ECO</span><span className="machine-dial"/></div>
          <div className="machine-name">ComfortLinen</div>
          <div className="machine-door"><div className="machine-rim"><div className="machine-window">
            <div className="machine-drum"/>
            <div className="machine-linen"><i/><i/><i/><i/></div>
            <div className="machine-water"/>
            <div className="machine-bubbles">{Array.from({length: 6}, (_, i) => <i key={i}/>)}</div>
            <span className="machine-glass"/>
          </div></div><span className="machine-handle"/></div>
          <div className="machine-base"><i/><span/></div>
        </div>
      </div>
      <p className="intro-caption">A fresh <em>start.</em></p>
      <div className="intro-progress" aria-hidden="true"><i/></div>
      <p className="intro-status" role="status">A little comfort is on its way</p>
    </div>
    <div className="intro-footer"><span>CARE IN EVERY FIBRE</span><span>©{new Date().getFullYear()} TRADEX INNOVATIONS</span></div>
  </div>;
}
