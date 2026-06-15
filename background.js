// Variable para el contexto de audio
let audioContext = null;
let currentAudio = null;

// Función para reproducir tu sonido MP3
function playAlarmSound() {
  try {
    // Detener cualquier sonido que se esté reproduciendo
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    // Crear nuevo elemento de audio con tu archivo MP3
    const audio = new Audio(chrome.runtime.getURL('alarma.mp3'));
    currentAudio = audio;
    
    // Configurar volumen
    audio.volume = 0.7;
    
    // Reproducir
    audio.play().catch(error => {
      console.log('Error reproduciendo sonido:', error);
      // Fallback: usar Web Audio API si el MP3 falla
      playBeepFallback();
    });
    
    // Limpiar referencia cuando termine
    audio.onended = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
    };
    
  } catch (e) {
    console.log('Error con MP3, usando beep alternativo:', e);
    playBeepFallback();
  }
}

// Sonido de respaldo (beep) en caso que el MP3 no funcione
function playBeepFallback() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const now = audioContext.currentTime;
    
    // Beep 1
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 880;
    gain1.gain.value = 0.3;
    osc1.start();
    gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.5);
    osc1.stop(now + 0.5);
    
    // Beep 2
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1046.5;
      gain2.gain.value = 0.3;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.5);
      osc2.stop(now + 0.5);
    }, 200);
    
  } catch(e) {
    console.log('Fallback de sonido falló:', e);
  }
}

// Escuchar alarmas
chrome.alarms.onAlarm.addListener((alarma) => {
  if (alarma.name.startsWith('alarma_')) {
    const idAlarma = parseInt(alarma.name.split('_')[1]);
    
    chrome.storage.local.get(['alarmas'], (resultado) => {
      const alarmas = resultado.alarmas || [];
      const alarmaData = alarmas.find(a => a.id === idAlarma);
      
      if (alarmaData) {
        // Reproducir sonido
        playAlarmSound();
        
        // Notificación del sistema usando tu icono PNG
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icono.png',
          title: '🔔 MASTER CONTROL',
          message: alarmaData.mensaje,
          priority: 2,
          requireInteraction: true
        });
        
        // Abrir ventana de alerta
        chrome.windows.create({
          url: `alert.html?msg=${encodeURIComponent(alarmaData.mensaje)}&playSound=true`,
          type: 'popup',
          width: 450,
          height: 350,
          focused: true
        });
        
        // Eliminar la alarma después de notificar
        const alarmasActualizadas = alarmas.filter(a => a.id !== idAlarma);
        chrome.storage.local.set({ alarmas: alarmasActualizadas });
        chrome.alarms.clear(alarma.name);
      }
    });
  }
});

// Inicialización
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ alarmas: [], notas: [], proxiesGuardados: [] });
  console.log('✅ Master Control instalado');
  console.log('📁 Archivos necesarios: icono.png y alarma.mp3');
});