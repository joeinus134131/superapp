'use client';

// 🎧 Premium Pomodoro Soundscapes
// Ambient sounds for focus sessions — Pro users only

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePremium } from '@/lib/premium';
import { Lock, Volume2, VolumeX } from 'lucide-react';

// ─── Ambient Sound Generator (Web Audio API, no external files) ────────────

const SOUNDSCAPES = [
  { id: 'rain', name: 'Hujan', emoji: '🌧️', color: '#3b82f6', desc: 'Suara hujan menenangkan' },
  { id: 'cafe', name: 'Café', emoji: '☕', color: '#f59e0b', desc: 'Suasana kafe yang sibuk' },
  { id: 'lofi', name: 'Lo-Fi', emoji: '🎵', color: '#8b5cf6', desc: 'Lo-fi beats santai' },
  { id: 'nature', name: 'Alam', emoji: '🌿', color: '#10b981', desc: 'Suara alam & burung' },
  { id: 'white', name: 'White Noise', emoji: '📻', color: '#6b7280', desc: 'White noise fokus' },
  { id: 'ocean', name: 'Laut', emoji: '🌊', color: '#06b6d4', desc: 'Ombak pantai' },
];

function createNoiseBuffer(ctx, duration = 2) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function startRainSound(ctx, dest) {
  // Brown noise + gentle filter for rain
  const noiseBuffer = createNoiseBuffer(ctx, 4);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 800;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 200;

  const gain = ctx.createGain();
  gain.gain.value = 0.15;

  source.connect(lowpass);
  lowpass.connect(highpass);
  highpass.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startCafeSound(ctx, dest) {
  // Broadband noise with midrange emphasis
  const noiseBuffer = createNoiseBuffer(ctx, 3);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1200;
  bandpass.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.08;

  source.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startLofiSound(ctx, dest) {
  // Soft oscillator cycle mimicking lo-fi chords
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'triangle';
  osc1.frequency.value = 220;
  osc2.frequency.value = 330;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 5;
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 600;

  const gain = ctx.createGain();
  gain.gain.value = 0.06;

  osc1.connect(lowpass);
  osc2.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(dest);

  osc1.start();
  osc2.start();
  lfo.start();

  return { sources: [osc1, osc2, lfo], gain };
}

function startNatureSound(ctx, dest) {
  // High-pass filtered noise for bird-like chirps + gentle wind
  const noiseBuffer = createNoiseBuffer(ctx, 5);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 3000;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 600;

  const gain1 = ctx.createGain();
  gain1.gain.value = 0.03;

  const windSource = ctx.createBufferSource();
  windSource.buffer = noiseBuffer;
  windSource.loop = true;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.06;

  source.connect(highpass);
  highpass.connect(gain1);
  gain1.connect(dest);

  windSource.connect(lowpass);
  lowpass.connect(windGain);
  windGain.connect(dest);

  source.start();
  windSource.start();

  return { sources: [source, windSource], gain: gain1 };
}

function startWhiteNoise(ctx, dest) {
  const noiseBuffer = createNoiseBuffer(ctx, 4);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 0.08;

  source.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startOceanSound(ctx, dest) {
  // Low rumble + wave-like LFO
  const noiseBuffer = createNoiseBuffer(ctx, 6);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 400;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(lowpass.frequency);

  const gain = ctx.createGain();
  gain.gain.value = 0.12;

  source.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(dest);
  source.start();
  lfo.start();

  return { source, lfo, gain };
}

const soundStarters = {
  rain: startRainSound,
  cafe: startCafeSound,
  lofi: startLofiSound,
  nature: startNatureSound,
  white: startWhiteNoise,
  ocean: startOceanSound,
};

// ─── Component ────────────────────────────────────────────────────────────

export default function PomodoroSoundscapes({ isTimerRunning }) {
  const { isPremium } = usePremium();
  const [activeSound, setActiveSound] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const audioCtxRef = useRef(null);
  const nodesRef = useRef(null);
  const masterGainRef = useRef(null);

  const stopSound = useCallback(() => {
    if (nodesRef.current) {
      const nodes = nodesRef.current;
      try {
        if (nodes.source) nodes.source.stop();
        if (nodes.sources) nodes.sources.forEach(s => { try { s.stop(); } catch {} });
        if (nodes.lfo) { try { nodes.lfo.stop(); } catch {} }
      } catch {}
      nodesRef.current = null;
    }
  }, []);

  const playSound = useCallback((soundId) => {
    if (!isPremium) return;
    
    stopSound();

    if (activeSound === soundId) {
      setActiveSound(null);
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.connect(ctx.destination);
    }
    masterGainRef.current.gain.value = volume;

    const starter = soundStarters[soundId];
    if (starter) {
      nodesRef.current = starter(ctx, masterGainRef.current);
      setActiveSound(soundId);
    }
  }, [isPremium, activeSound, volume, stopSound]);

  // Update volume reactively
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, [volume]);

  // Stop sound when timer stops (optional behavior)
  useEffect(() => {
    if (!isTimerRunning && activeSound) {
      // Keep playing — user can manually stop
    }
  }, [isTimerRunning, activeSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSound();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopSound]);

  if (!isPremium) {
    return (
      <div className="card card-padding mt-3" style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.06))',
        border: '1px solid rgba(139,92,246,0.15)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>
          <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={20} /> Ambient Soundscapes
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SOUNDSCAPES.slice(0, 4).map(s => (
              <div key={s.id} style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--bg-glass)', flex: '1 1 calc(50% - 4px)' }}>
                <span>{s.emoji} {s.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <Lock size={28} color="#f59e0b" style={{ marginBottom: '8px' }} />
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>Ambient Soundscapes</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>Eksklusif untuk pengguna Pro</span>
          <a href="/settings" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Lock size={12} /> Upgrade ke Pro
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-padding mt-3" style={{
      background: 'linear-gradient(135deg, rgba(139,92,246,0.04), rgba(6,182,212,0.04))',
      border: '1px solid rgba(139,92,246,0.1)',
    }}>
      <div className="flex justify-between items-center mb-2">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Volume2 size={18} color="#8b5cf6" /> Ambient Soundscapes 👑
        </div>
        {activeSound && (
          <button className="btn btn-sm btn-secondary" onClick={() => { stopSound(); setActiveSound(null); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <VolumeX size={14} /> Stop
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {SOUNDSCAPES.map(s => (
          <button
            key={s.id}
            onClick={() => playSound(s.id)}
            className="btn"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '12px 8px', borderRadius: '12px', fontSize: '12px',
              background: activeSound === s.id ? `${s.color}22` : 'var(--bg-glass)',
              border: activeSound === s.id ? `2px solid ${s.color}` : '1px solid var(--border-color)',
              color: activeSound === s.id ? s.color : 'var(--text-primary)',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '24px' }}>{s.emoji}</span>
            <span style={{ fontWeight: 600 }}>{s.name}</span>
          </button>
        ))}
      </div>

      {activeSound && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <VolumeX size={14} color="var(--text-muted)" />
          <input
            type="range" min="0" max="1" step="0.05"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#8b5cf6' }}
          />
          <Volume2 size={14} color="var(--text-muted)" />
          <span className="text-xs text-muted" style={{ minWidth: '30px' }}>{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}
