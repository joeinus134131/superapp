'use client';

// 🎧 Premium Pomodoro Soundscapes
// Ambient sounds for focus sessions — Pro users only

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePremium } from '@/lib/premium';
import { Lock, Volume2, VolumeX } from 'lucide-react';

// ─── Ambient Sound Generator (Web Audio API, no external files) ────────────

const SOUNDSCAPES = [
  { id: 'rain', name: 'Hujan', emoji: '🌧️', color: '#3b82f6', desc: 'Suara hujan yang menenangkan', icon: '🌧️', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/15/audio_d1718ab41b.mp3' },
  { id: 'cafe', name: 'Kafe', emoji: '☕', color: '#f59e0b', desc: 'Ambiens kafe yang nyaman', icon: '☕', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c4ecb8e1.mp3' },
  { id: 'lofi', name: 'Lo-Fi', emoji: '🎵', color: '#8b5cf6', desc: 'Beat lo-fi yang santai', icon: '🎵', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/17/audio_e42dead4f5.mp3' },
  { id: 'forest', name: 'Hutan', emoji: '🌲', color: '#10b981', desc: 'Suara alam & burung', icon: '🌲', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/16/audio_c05c8de50d.mp3' },
  { id: 'focus', name: 'Focus', emoji: '🎯', color: '#ef4444', desc: 'Pink noise untuk fokus', icon: '🎯', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_de6bac1e70.mp3' },
  { id: 'ocean', name: 'Laut', emoji: '🌊', color: '#06b6d4', desc: 'Ombak pantai yang tenang', icon: '🌊', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/15/audio_2c3e8e1e35.mp3' },
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
  // Realistic rain with droplet-like clicks and rustling
  const duration = 8;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Multiple noise layers for realistic rain
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.08) * 0.96;
    
    // Add impulses (rain drops)
    const impulse = Math.random() > 0.98 ? (Math.random() - 0.5) * 2 : 0;
    data[i] = Math.max(-1, Math.min(1, lastValue * 0.4 + impulse * 0.3));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Heavy high-pass to get rain-like sound
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 1500;  // Boost higher frequencies for rain
  highpass.Q.value = 1.0;

  // Gentle low-pass to remove harshness
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 8000;
  lowpass.Q.value = 0.6;

  const gain = ctx.createGain();
  gain.gain.value = 0.25;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startCafeSound(ctx, dest) {
  // Realistic cafe with layered chatter and clinking
  const duration = 5;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.1) * 0.94;
    
    // Add occasional sharp clicks (cups, cutlery)
    const click = Math.random() > 0.97 ? Math.sin(i * 0.1) * (Math.random() - 0.5) : 0;
    data[i] = lastValue * 0.5 + click * 0.2;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Voice-like range (focus on speech frequencies)
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 3000;  // Speech range
  lowpass.Q.value = 0.7;

  // Boost mid-range for chatter effect
  const midrange = ctx.createBiquadFilter();
  midrange.type = 'peaking';
  midrange.frequency.value = 1500;
  midrange.gain.value = 5;  // More pronounced
  midrange.Q.value = 0.8;

  // Remove rumble
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 300;

  const gain = ctx.createGain();
  gain.gain.value = 0.18;

  source.connect(highpass);
  highpass.connect(midrange);
  midrange.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startLofiSound(ctx, dest) {
  // Chill lo-fi beats with warm bass and jazzy chords
  // Create bass drum pattern
  const bassDrum = ctx.createOscillator();
  bassDrum.type = 'sine';
  bassDrum.frequency.setValueAtTime(150, ctx.currentTime);
  
  const bassEnv = ctx.createGain();
  bassEnv.gain.setValueAtTime(0.3, ctx.currentTime);
  
  // Jazzy chord notes (C-E-G progression)
  const chord1 = ctx.createOscillator();
  chord1.type = 'sine';
  chord1.frequency.value = 130;  // C3
  
  const chord2 = ctx.createOscillator();
  chord2.type = 'sine';
  chord2.frequency.value = 165;  // E3
  
  const chord3 = ctx.createOscillator();
  chord3.type = 'sine';
  chord3.frequency.value = 196;  // G3
  
  const chordGain = ctx.createGain();
  chordGain.gain.value = 0.08;

  // Warm tone with low-pass
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 2000;
  lowpass.Q.value = 1.5;
  
  // Add slight reverb character with delay
  const delayNode = ctx.createDelay(0.5);
  delayNode.delayTime.value = 0.15;
  
  const delayGain = ctx.createGain();
  delayGain.gain.value = 0.15;
  
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.3;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.1;

  // Connect bass drum
  bassDrum.connect(bassEnv);
  bassEnv.connect(lowpass);
  
  // Connect chords
  chord1.connect(chordGain);
  chord2.connect(chordGain);
  chord3.connect(chordGain);
  chordGain.connect(lowpass);

  // Main path with delay
  lowpass.connect(delayNode);
  delayNode.connect(delayGain);
  delayGain.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  
  lowpass.connect(masterGain);
  delayGain.connect(masterGain);
  masterGain.connect(dest);

  // Start all oscillators
  bassDrum.start();
  chord1.start();
  chord2.start();
  chord3.start();

  return { sources: [bassDrum, chord1, chord2, chord3], gain: masterGain };
}

function startNatureSound(ctx, dest) {
  // Realistic forest with wind, rustling leaves, and birds
  const duration = 6;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Wind and rustling leaves
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.06) * 0.95;
    
    // Add breeze variation
    const breeze = Math.sin(i * 0.00005) * 0.15;
    data[i] = lastValue * 0.4 + breeze;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Wind layer
  const windHighpass = ctx.createBiquadFilter();
  windHighpass.type = 'highpass';
  windHighpass.frequency.value = 500;

  const windGain = ctx.createGain();
  windGain.gain.value = 0.08;

  source.connect(windHighpass);
  windHighpass.connect(windGain);
  windGain.connect(dest);

  // Bird-like chirps (oscillators for high frequencies)
  const birdOsc = ctx.createOscillator();
  birdOsc.type = 'sine';
  birdOsc.frequency.setValueAtTime(2000, ctx.currentTime);
  
  const birdLfo = ctx.createOscillator();
  birdLfo.type = 'sine';
  birdLfo.frequency.value = 3;
  
  const birdLfoGain = ctx.createGain();
  birdLfoGain.gain.value = 500;
  
  const birdGain = ctx.createGain();
  birdGain.gain.setValueAtTime(0, ctx.currentTime);
  
  // Periodic bird chirps
  const birdEnv = [];
  for (let t = 0; t < duration; t += 1 + Math.random() * 2) {
    birdEnv.push({ time: t, gain: 0.04 });
    birdEnv.push({ time: t + 0.3, gain: 0 });
  }

  birdLfo.connect(birdLfoGain);
  birdLfoGain.connect(birdOsc.frequency);
  birdOsc.connect(birdGain);
  birdGain.connect(dest);

  source.start();
  birdOsc.start();
  birdLfo.start();

  return { sources: [source, birdOsc, birdLfo], gain: windGain };
}

function startWhiteNoise(ctx, dest) {
  // True pink noise for focus - reduces ear fatigue better than white noise
  const duration = 8;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Generate pink noise using multiple poles
  let lastValue = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.04) * 0.99;  // Very smooth for pink noise
    data[i] = lastValue * 0.8;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Gentle high-pass to remove very low rumble
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 50;
  highpass.Q.value = 0.5;

  // Soft low-pass for comfort
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 10000;
  lowpass.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.15;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}

function startOceanSound(ctx, dest) {
  // Realistic ocean waves with surf sound and water movement
  const duration = 12;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Multiple wave frequencies for realistic ocean
  let lastValue = 0;
  let lastValue2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastValue = (lastValue + white * 0.1) * 0.92;
    lastValue2 = (lastValue2 + white * 0.06) * 0.96;
    
    // Complex wave pattern with multiple frequencies
    const wave1 = Math.sin(i * 0.0002) * 0.3;
    const wave2 = Math.sin(i * 0.00008) * 0.2;
    
    data[i] = Math.max(-1, Math.min(1, lastValue * 0.4 + lastValue2 * 0.3 + wave1 + wave2));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Remove sub-bass rumble
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 80;
  highpass.Q.value = 0.8;

  // Broad low-pass for wave swishing
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 3000;
  lowpass.Q.value = 0.6;

  // Peak in mid-range for wave presence
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 500;
  presence.gain.value = 3;
  presence.Q.value = 0.7;

  // Slow wave-like LFO for breathing effect
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.12;  // Slow wave cycles
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 600;
  lfo.connect(lfoGain);
  lfoGain.connect(lowpass.frequency);

  const gain = ctx.createGain();
  gain.gain.value = 0.22;

  source.connect(highpass);
  highpass.connect(presence);
  presence.connect(lowpass);
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
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const nodesRef = useRef(null);
  const masterGainRef = useRef(null);

  const stopSound = useCallback(() => {
    // Stop HTML audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Stop Web Audio synthesis (fallback)
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

    // Find the soundscape
    const soundscape = SOUNDSCAPES.find(s => s.id === soundId);
    if (!soundscape) return;

    // Try to play real audio file first
    if (soundscape.audioUrl) {
      try {
        const audio = new Audio(soundscape.audioUrl);
        audio.loop = true;
        audio.volume = volume;
        audio.crossOrigin = 'anonymous';
        
        let loadTimeout = setTimeout(() => {
          console.log('Audio load timeout, trying synthesis:', soundscape.id);
          if (audioRef.current === audio) {
            playWebAudioSynthesis(soundId);
          }
        }, 3000);
        
        audio.addEventListener('canplay', () => {
          clearTimeout(loadTimeout);
          audio.play().catch(err => {
            console.log('Audio play failed, falling back to synthesis:', err);
            playWebAudioSynthesis(soundId);
          });
        }, { once: true });

        audio.addEventListener('error', (err) => {
          clearTimeout(loadTimeout);
          console.log('Audio file error:', err.message);
          playWebAudioSynthesis(soundId);
        });

        audioRef.current = audio;
        setActiveSound(soundId);
        return;
      } catch (err) {
        console.log('Audio creation failed:', err.message);
      }
    }

    // Fallback: Use Web Audio synthesis
    playWebAudioSynthesis(soundId);
  }, [isPremium, activeSound, volume, stopSound]);

  const playWebAudioSynthesis = (soundId) => {
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
  };

  // Update volume reactively
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
        {SOUNDSCAPES.map(s => (
          <button
            key={s.id}
            onClick={() => playSound(s.id)}
            className="btn"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              padding: '18px 12px', borderRadius: '14px', fontSize: '13px',
              background: activeSound === s.id ? `${s.color}20` : 'rgba(255,255,255,0.03)',
              border: activeSound === s.id ? `2px solid ${s.color}` : '1px solid rgba(255,255,255,0.08)',
              color: activeSound === s.id ? s.color : 'var(--text-primary)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              fontWeight: activeSound === s.id ? 600 : 500,
              transform: activeSound === s.id ? 'scale(1.05)' : 'scale(1)',
              boxShadow: activeSound === s.id ? `0 0 16px ${s.color}40` : 'none',
              minHeight: '110px',
              justifyContent: 'center',
              textAlign: 'center',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: '40px', lineHeight: '1', display: 'block', marginBottom: '4px' }}>{s.emoji}</span>
            <span style={{ fontWeight: 700, fontSize: '13px', lineHeight: '1.3', display: 'block' }}>{s.name}</span>
          </button>
        ))}
      </div>

      {activeSound && (
        <>
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
          
          {/* Show soundscape description when playing */}
          {(() => {
            const sound = SOUNDSCAPES.find(s => s.id === activeSound);
            return sound ? (
              <div style={{
                marginTop: '10px',
                padding: '10px 12px',
                background: 'rgba(139,92,246,0.06)',
                borderRadius: '8px',
                textAlign: 'center',
                borderLeft: `3px solid ${sound.color}`,
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  fontWeight: 500,
                }}>
                  {sound.desc}
                </p>
              </div>
            ) : null;
          })()}
        </>
      )}
    </div>
  );
}
