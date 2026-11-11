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

/** Soft wind, rustling leaves and occasional stereo bird calls, enabled by the visitor. */
export function useAmbientSound() {
  const [sound, setSound] = useState(false);
  const audio = useRef<Ambience | null>(null);
  const requested = useRef(false);
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
        current.gain.gain.cancelScheduledValues(current.context.currentTime);
        current.gain.gain.setTargetAtTime(.65, current.context.currentTime, .6);
      } else {
        current.gain.gain.cancelScheduledValues(current.context.currentTime);
        current.gain.gain.setTargetAtTime(0, current.context.currentTime, .05);
        // Let the fade finish before suspending; rapid toggles cancel this timer.
        current.suspendTimer = setTimeout(() => {
          if (request === revision.current && current.context.state !== 'closed') void current.context.suspend().catch(() => {});
        }, 280);
      }
    } catch {
      if (request === revision.current) {requested.current = false; setSound(false);}
    }
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    requested.current = enabled;
    try {
      if (!audio.current && enabled) audio.current = createAmbience();
      setSound(enabled);
      await updatePlayback();
    } catch {
      requested.current = false; setSound(false);
    }
  }, [updatePlayback]);

  useEffect(() => {
    const visibility = () => {void updatePlayback();};
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      revision.current++;
      requested.current = false;
      const current = audio.current;
      audio.current = null;
      if (current) {
        clearTimeout(current.suspendTimer);
        current.sources.forEach(source => {source.stop(); source.disconnect();});
        current.nodes.forEach(node => node.disconnect());
        void current.context.close();
      }
    };
  }, [updatePlayback]);
  return {sound, setEnabled};
}
