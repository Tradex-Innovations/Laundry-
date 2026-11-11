'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {makeBirdsong, makeWind, type StereoSound} from './natureSound';

type Ambience = {
  context: AudioContext;
  gain: GainNode;
  sources: AudioBufferSourceNode[];
  nodes: AudioNode[];
  suspendTimer?: ReturnType<typeof setTimeout>;
};

function createAmbience(): Ambience {
  const context = new AudioContext();
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(context.destination);
  const sources: AudioBufferSourceNode[] = [];
  const nodes: AudioNode[] = [gain];
  const addLayer = (sound: StereoSound, volume: number, lowpass: number, highpass: number) => {
    const buffer = context.createBuffer(2, sound.channels[0].length, sound.sampleRate);
    sound.channels.forEach((channel, index) => buffer.getChannelData(index).set(channel));
    const source = context.createBufferSource();
    source.buffer = buffer; source.loop = true;
    const level = context.createGain(); level.gain.value = volume;
    const low = context.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = lowpass; low.Q.value = .5;
    const high = context.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = highpass; high.Q.value = .5;
    source.connect(high); high.connect(low); low.connect(level); level.connect(gain);
    sources.push(source); nodes.push(high, low, level);
  };
  addLayer(makeWind(), .3, 1400, 100);
  addLayer(makeBirdsong(), .26, 7200, 1500);
  // Different loop lengths keep the wind and bird phrases from repeating together.
  sources.forEach(source => source.start());
  return {context, gain, sources, nodes};
}

/** Nature ambience with a default-on preference and browser-compliant gesture recovery. */
export function useAmbientSound({defaultEnabled = false}: {defaultEnabled?: boolean} = {}) {
  const [sound, setSound] = useState(defaultEnabled);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<Ambience | null>(null);
  const requested = useRef(defaultEnabled);
  const revision = useRef(0);

  const updatePlayback = useCallback(async () => {
    const request = ++revision.current;
    const current = audio.current;
    if (!current) return;
    clearTimeout(current.suspendTimer);
    const audible = requested.current && !document.hidden;
    try {
      if (audible) {
        await current.context.resume();
        if (request !== revision.current) return;
        setPlaying(current.context.state === 'running');
        current.gain.gain.cancelScheduledValues(current.context.currentTime);
        current.gain.gain.setTargetAtTime(.65, current.context.currentTime, .6);
      } else {
        setPlaying(false);
        current.gain.gain.cancelScheduledValues(current.context.currentTime);
        current.gain.gain.setTargetAtTime(0, current.context.currentTime, .05);
        // Let the fade finish before suspending; rapid toggles cancel this timer.
        current.suspendTimer = setTimeout(() => {
          if (request === revision.current && current.context.state !== 'closed') void current.context.suspend().catch(() => {});
        }, 280);
      }
    } catch {
      // An autoplay rejection must not erase the visitor's enabled preference.
      // A later trusted pointer or keyboard interaction retries the same context.
      if (request === revision.current) setPlaying(false);
    }
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    requested.current = enabled;
    try {
      if (!audio.current && enabled) {
        const current = createAmbience();
        audio.current = current;
        current.context.onstatechange = () => {
          if (audio.current === current) setPlaying(requested.current && !document.hidden && current.context.state === 'running');
        };
      }
      setSound(enabled);
      if (!enabled) setPlaying(false);
      await updatePlayback();
    } catch {
      requested.current = false; setSound(false); setPlaying(false);
    }
  }, [updatePlayback]);

  useEffect(() => {
    const visibility = () => {void updatePlayback();};
    const gesture = (event: Event) => {
      if (!event.isTrusted || !requested.current || document.hidden) return;
      // A mute click should mute without also unlocking audio just beforehand.
      if (event.target instanceof Element && event.target.closest('[data-sound-toggle]')) return;
      if (event instanceof KeyboardEvent && (event.metaKey || event.ctrlKey || event.altKey || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key))) return;
      if (!audio.current || audio.current.context.state !== 'running') void setEnabled(true);
    };
    const initial = defaultEnabled ? requestAnimationFrame(() => {void setEnabled(true);}) : 0;
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pointerdown', gesture, {capture: true, passive: true});
    window.addEventListener('click', gesture, {capture: true, passive: true});
    window.addEventListener('keydown', gesture, {capture: true});
    return () => {
      cancelAnimationFrame(initial);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pointerdown', gesture, true);
      window.removeEventListener('click', gesture, true);
      window.removeEventListener('keydown', gesture, true);
      revision.current++;
      requested.current = false;
      const current = audio.current;
      audio.current = null;
      if (current) {
        current.context.onstatechange = null;
        clearTimeout(current.suspendTimer);
        current.sources.forEach(source => {source.stop(); source.disconnect();});
        current.nodes.forEach(node => node.disconnect());
        void current.context.close();
      }
    };
  }, [defaultEnabled, setEnabled, updatePlayback]);
  return {sound, playing, setEnabled};
}
