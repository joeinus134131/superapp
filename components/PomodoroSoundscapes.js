'use client';

// 🎧 Premium Pomodoro Soundscapes
// Ambient sounds for focus sessions — Pro users only

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePremium } from '@/lib/premium';
import { Lock, Volume2, VolumeX } from 'lucide-react';

// ─── Ambient Sound Generator (Web Audio API, no external files) ────────────

const SOUNDSCAPES = [
  { id: 'rain', name: 'Hujan', emoji: '🌧️', color: '#3b82f6', desc: 'Suara hujan yang menenangkan', icon: '🌧️' },
  { id: 'cafe', name: 'Kafe', emoji: '☕', color: '#f59e0b', desc: 'Ambiens kafe yang nyaman', icon: '☕' },
  { id: 'lofi', name: 'Lo-Fi', emoji: '🎵', color: '#8b5cf6', desc: 'Beat lo-fi yang santai', icon: '🎵' },
  { id: 'forest', name: 'Hutan', emoji: '�', color: '#10b981', desc: 'Suara alam & burung', icon: '🌲' },
  { id: 'focus', name: 'Focus', emoji: '🎯', color: '#ef4444', desc: 'Pink noise untuk fokus', icon: '🎯' },
  { id: 'ocean', name: 'Laut', emoji: '🌊', color: '#06b6d4', desc: 'Ombak pantai yang tenang', icon: '🌊' },
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
  // Improved rain with multiple noise layers and frequency sweeps
  const duration = 4;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Generate smoother brownian noise
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.1) * 0.95;
    data[i] = lastValue * 0.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Multi-filter for realistic rain
  const lowpass1 = ctx.createBiquadFilter();
  lowpass1.type = 'lowpass';
  lowpass1.frequency.value = 1200;
  lowpass1.Q.value = 0.5;

  const lowpass2 = ctx.createBiquadFilter();
  lowpass2.type = 'lowpass';
  lowpass2.frequency.value = 800;
  lowpass2.Q.value = 0.3;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 150;

  const gain = ctx.createGain();
  gain.gain.value = 0.18;

  source.connect(highpass);
  highpass.connect(lowpass1);
  lowpass1.connect(lowpass2);
  lowpass2.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startCafeSound(ctx, dest) {
  // Improved cafe ambience with voice-like components
  const duration = 3;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.15) * 0.92;
    data[i] = lastValue;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1500;
  bandpass.Q.value = 0.8;

  const midrange = ctx.createBiquadFilter();
  midrange.type = 'peaking';
  midrange.frequency.value = 2000;
  midrange.gain.value = 3;
  midrange.Q.value = 0.6;

  const gain = ctx.createGain();
  gain.gain.value = 0.1;

  source.connect(bandpass);
  bandpass.connect(midrange);
  midrange.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startLofiSound(ctx, dest) {
  // Improved lo-fi with jazz-like chords
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc3.type = 'triangle';
  
  osc1.frequency.value = 110;
  osc2.frequency.value = 165;
  osc3.frequency.value = 220;

  // Smooth LFO for modulation
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.4;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 8;
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 800;
  lowpass.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.value = 0.05;

  osc1.connect(lowpass);
  osc2.connect(lowpass);
  osc3.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(dest);

  osc1.start();
  osc2.start();
  osc3.start();
  lfo.start();

  return { sources: [osc1, osc2, osc3, lfo], gain };
}

function startNatureSound(ctx, dest) {
  // Improved forest sounds with wind and subtle bird-like elements
  const duration = 5;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.08) * 0.94;
    data[i] = lastValue * 0.6;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Wind layer
  const windHighpass = ctx.createBiquadFilter();
  windHighpass.type = 'highpass';
  windHighpass.frequency.value = 800;

  const windGain = ctx.createGain();
  windGain.gain.value = 0.05;

  source.connect(windHighpass);
  windHighpass.connect(windGain);
  windGain.connect(dest);

  // Bird-like chirps with high-pass noise
  const chirpBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const chirpData = chirpBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    chirpData[i] = Math.random() * 2 - 1;
  }

  const chirpSource = ctx.createBufferSource();
  chirpSource.buffer = chirpBuffer;
  chirpSource.loop = true;

  const chirpHighpass = ctx.createBiquadFilter();
  chirpHighpass.type = 'highpass';
  chirpHighpass.frequency.value = 3500;

  const chirpGain = ctx.createGain();
  chirpGain.gain.value = 0.02;

  chirpSource.connect(chirpHighpass);
  chirpHighpass.connect(chirpGain);
  chirpGain.connect(dest);

  source.start();
  chirpSource.start();

  return { sources: [source, chirpSource], gain: windGain };
}

function startWhiteNoise(ctx, dest) {
  // Pink noise (1/f noise) - better for focus than white noise
  const duration = 4;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.05) * 0.98;
    data[i] = lastValue;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 0.1;

  source.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startOceanSound(ctx, dest) {
  // Improved ocean waves with realistic frequency sweep
  const duration = 6;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.12) * 0.93;
    data[i] = lastValue;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 500;
  lowpass.Q.value = 0.8;

  // Wave-like LFO modulation
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 250;
  lfo.connect(lfoGain);
  lfoGain.connect(lowpass.frequency);

  const gain = ctx.createGain();
  gain.gain.value = 0.14;

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
  forest: startNatureSound,
  focus: startWhiteNoise,
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
      background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.06))',
      border: '1px solid rgba(139,92,246,0.15)',
    }}>
      <div className="flex justify-between items-center mb-3">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <span style={{ fontSize: '20px' }}>🎵</span>
          <span>Ambient Soundscapes</span>
        </div>
        {activeSound && (
          <button className="btn btn-sm btn-secondary" onClick={() => { stopSound(); setActiveSound(null); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <VolumeX size={14} /> Stop
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        {SOUNDSCAPES.map(s => (
          <button
            key={s.id}
            onClick={() => playSound(s.id)}
            className="btn"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '14px 10px', borderRadius: '14px', fontSize: '13px',
              background: activeSound === s.id ? `${s.color}20` : 'rgba(255,255,255,0.03)',
              border: activeSound === s.id ? `2px solid ${s.color}` : '1px solid rgba(255,255,255,0.08)',
              color: activeSound === s.id ? s.color : 'var(--text-primary)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              fontWeight: activeSound === s.id ? 600 : 500,
              transform: activeSound === s.id ? 'scale(1.05)' : 'scale(1)',
              boxShadow: activeSound === s.id ? `0 0 16px ${s.color}40` : 'none',
            }}
          >
            <span style={{ fontSize: '28px', lineHeight: '1' }}>{s.emoji}</span>
            <span>{s.name}</span>
            <span className="text-xs" style={{ opacity: 0.7, marginTop: '2px' }}>{s.desc}</span>
          </button>
        ))}
      </div>

      {activeSound && (
        <div style={{ 
          padding: '12px 14px', 
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.15)',
          borderRadius: '10px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px' 
        }}>
          <VolumeX size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{ 
              flex: 1, 
              accentColor: '#8b5cf6',
              height: '4px',
              borderRadius: '2px',
            }}
          />
          <Volume2 size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <span className="text-xs" style={{ 
            minWidth: '35px', 
            textAlign: 'right',
            fontWeight: 600,
            color: '#8b5cf6'
          }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
