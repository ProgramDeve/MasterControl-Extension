// Función para reproducir sonido en la ventana de alerta
function playAlertSound() {
  try {
    const audio = new Audio(chrome.runtime.getURL('alarma.mp3'));
    audio.volume = 0.7;
    audio.play().catch(error => {
      console.log('Error reproduciendo sonido en alerta:', error);
      playBeepAlertFallback();
    });
  } catch(e) {
    playBeepAlertFallback();
  }
}

// Sonido de respaldo para la alerta
function playBeepAlertFallback() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    const frequencies = [880, 1046.5, 880, 1318.52];
    const durations = [0.2, 0.2, 0.2, 0.3];
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.frequency.value = freq;
      gain.gain.value = 0.3;
      oscillator.start(now + index * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + index * 0.25 + durations[index]);
      oscillator.stop(now + index * 0.25 + durations[index]);
    });
  } catch(e) {
    console.log('Error en fallback de sonido');
  }
}

// Leer parámetros de URL
const urlParams = new URLSearchParams(window.location.search);
const mensaje = urlParams.get('msg');
const playSound = urlParams.get('playSound');

// Mostrar mensaje
if (mensaje) {
  document.getElementById('alertMessage').textContent = decodeURIComponent(mensaje);
} else {
  document.getElementById('alertMessage').textContent = 'Recordatorio';
}

// Mostrar hora actual
const ahora = new Date();
document.getElementById('alertTime').textContent = `🕐 ${ahora.toLocaleTimeString()} - ${ahora.toLocaleDateString()}`;

// Reproducir sonido
playAlertSound();

// Cerrar al hacer clic
document.getElementById('btnOk').addEventListener('click', () => {
  window.close();
});

// Auto-cerrar después de 25 segundos
setTimeout(() => {
  window.close();
}, 25000);