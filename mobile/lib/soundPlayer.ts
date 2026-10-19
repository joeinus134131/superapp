// Safe Audio Player for Expo SDK 57 (Expo Go compatible)
// Degrades gracefully without crashing if native audio modules are unavailable

let expoAudio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expoAudio = require('expo-audio');
} catch (e) {
  expoAudio = null;
}

let currentPlayer: any = null;

export async function initAudioMode(): Promise<void> {
  if (!expoAudio?.setAudioModeAsync) return;
  try {
    await expoAudio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  } catch (err) {
    console.warn('[SoundPlayer] Failed to set audio mode:', err);
  }
}

export async function playAmbientSound(url: string, volume: number = 0.5): Promise<boolean> {
  await stopAmbientSound();

  if (!expoAudio?.createAudioPlayer) {
    console.log('[SoundPlayer] Audio playback not supported in this runtime environment.');
    return false;
  }

  try {
    const player = expoAudio.createAudioPlayer({ uri: url });
    if (player) {
      if (typeof player.volume !== 'undefined') player.volume = volume;
      if (typeof player.loop !== 'undefined') player.loop = true;
      if (typeof player.play === 'function') player.play();
      currentPlayer = player;
      return true;
    }
  } catch (err) {
    console.warn('[SoundPlayer] Error playing ambient sound:', err);
  }
  return false;
}

export async function stopAmbientSound(): Promise<void> {
  if (currentPlayer) {
    try {
      if (typeof currentPlayer.pause === 'function') currentPlayer.pause();
      if (typeof currentPlayer.remove === 'function') currentPlayer.remove();
    } catch {
      // Ignore cleanup error
    }
    currentPlayer = null;
  }
}

export function isAudioAvailable(): boolean {
  return !!expoAudio?.createAudioPlayer;
}
