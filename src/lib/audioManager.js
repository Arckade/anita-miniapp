let currentAudio = null;
let currentUrl = null;

export function play(url) {
  if (!url) return null;

  // Stop any previously playing audio
  try {
    if (currentAudio && typeof currentAudio.pause === 'function') {
      currentAudio.pause();
    }
  } catch (e) {
    console.error('Error stopping previous audio', e);
  }

  currentAudio = new Audio(url);
  currentUrl = url;

  currentAudio.onended = () => {
    if (currentAudio) {
      currentAudio = null;
      currentUrl = null;
    }
  };

  currentAudio.play().catch(err => {
    console.error('Audio play failed:', err);
  });

  return currentAudio;
}

export function stop() {
  try {
    if (currentAudio && typeof currentAudio.pause === 'function') {
      currentAudio.pause();
    }
  } catch (e) {
    console.error('Error stopping audio', e);
  }
  currentAudio = null;
  currentUrl = null;
}

export function getCurrentUrl() {
  return currentUrl;
}

export default { play, stop, getCurrentUrl };
