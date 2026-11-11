/** Original, locally synthesized outdoor ambience. No audio downloads are required. */
export type StereoSound = {sampleRate: number; channels: [Float32Array, Float32Array]};

function randomSequence(seed: number) {
  return () => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296;};
}

export function makeWind(sampleRate = 24000): StereoSound {
  const length = sampleRate * 13;
  const overlap = Math.round(sampleRate * .65);
  const channels = [new Float32Array(length), new Float32Array(length)] as StereoSound['channels'];
  channels.forEach((channel, side) => {
    const random = randomSequence(1723 + side * 83);
    const raw = new Float32Array(length + overlap);
    let low = 0, middle = 0, rustle = 0;
    for (let i = 0; i < raw.length; i++) {
      const t = i / sampleRate;
      const noise = random() * 2 - 1;
      low = low * .986 + noise * .014;
      middle = middle * .88 + noise * .12;
      rustle = rustle * .57 + noise * .43;
      const gust = .62 + .2 * Math.sin(t * .48 + side * .3) + .12 * Math.sin(t * 1.13 + 2);
      const leaves = .5 + .5 * Math.sin(t * .91 + Math.sin(t * .4));
      raw[i] = (low * 1.8 + middle * .15 + (rustle - middle) * leaves * .045) * gust;
    }
    channel.set(raw.subarray(0, length));
    // Join consecutive loops with an overlap instead of a hard noise discontinuity.
    for (let i = 0; i < overlap; i++) {
      const blend = i / overlap;
      channel[i] = raw[length + i] * (1 - blend) + raw[i] * blend;
    }
  });
  return {sampleRate, channels};
}

export function makeBirdsong(sampleRate = 24000): StereoSound {
  const channels = [new Float32Array(sampleRate * 53), new Float32Array(sampleRate * 53)] as StereoSound['channels'];
  const random = randomSequence(29047);
  // Unhurried, uneven phrases alternate between nearby and more distant trees.
  const phrases = [1.1, 7.8, 13.4, 21.2, 29.6, 36.3, 44.7, 49.2];
  phrases.forEach((start, phrase) => {
    const twitter = phrase % 3 === 0;
    const notes = twitter ? 5 + Math.floor(random() * 3) : 2 + Math.floor(random() * 3);
    const pan = (random() - .5) * 1.35;
    const left = Math.cos((pan + 1) * Math.PI / 4), right = Math.sin((pan + 1) * Math.PI / 4);
    const distance = .65 + random() * .35;
    const base = twitter ? 3500 + random() * 950 : 2500 + random() * 900;
    let at = start;
    for (let note = 0; note < notes; note++) {
      const duration = twitter ? .065 + random() * .065 : .14 + random() * .13;
      const length = Math.floor(duration * sampleRate);
      const offset = Math.floor(at * sampleRate);
      const pitch = base * (.91 + random() * .2);
      const rise = 450 + random() * 1150;
      const fall = 700 + random() * 1350;
      let phase = 0;
      for (let i = 0; i < length; i++) {
        const u = i / length, t = i / sampleRate;
        // A fast upward scoop, falling tail, and small rough flutter avoid a pure beep.
        const frequency = pitch + rise * Math.sin(u * Math.PI * .9) - fall * u * u + Math.sin(t * 2 * Math.PI * 51) * 65;
        phase += 2 * Math.PI * frequency / sampleRate;
        const envelope = Math.pow(Math.sin(Math.PI * u), 1.6) * (1 - u * .3);
        const breath = (random() * 2 - 1) * .035;
        const tone = Math.sin(phase + .22 * Math.sin(phase * 2)) + .1 * Math.sin(phase * 2.01);
        const value = (tone + breath) * envelope * distance * .38;
        const sample = offset + i;
        if (sample >= channels[0].length) break;
        channels[0][sample] += value * left;
        channels[1][sample] += value * right;
        // Quiet reflections suggest an open garden without a conspicuous echo effect.
        const echo = sample + Math.round(sampleRate * .083);
        if (echo < channels[0].length) {channels[0][echo] += value * right * .055; channels[1][echo] += value * left * .055;}
      }
      at += duration + (twitter ? .04 : .12) + random() * .1;
    }
  });
  return {sampleRate, channels};
}
