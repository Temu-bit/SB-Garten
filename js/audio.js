// Retro Audio Generator via Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

export const audioService = {
    playPlant: () => {
        // Deep plop sound
        playTone(300, 'sine', 0.1, 0.5);
        setTimeout(() => playTone(200, 'sine', 0.15, 0.4), 50);
    },
    playWater: () => {
        // Higher pitched splash
        playTone(600, 'triangle', 0.1, 0.3);
        setTimeout(() => playTone(800, 'triangle', 0.1, 0.3), 50);
        setTimeout(() => playTone(1200, 'triangle', 0.1, 0.2), 100);
    },
    playHarvest: () => {
        // Happy little jingle
        playTone(400, 'square', 0.1, 0.1);
        setTimeout(() => playTone(600, 'square', 0.1, 0.1), 100);
        setTimeout(() => playTone(800, 'square', 0.2, 0.1), 200);
    },
    playCoin: () => {
        // Classic coin ding
        playTone(987.77, 'square', 0.1, 0.1);
        setTimeout(() => playTone(1318.51, 'square', 0.3, 0.1), 100);
    },
    playError: () => {
        // Low buzz
        playTone(150, 'sawtooth', 0.2, 0.2);
    }
};
