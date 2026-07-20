/**
 * LingoPop - Voice Engine (Speech Synthesis)
 */

function speakWord(text) {
  if ('speechSynthesis' in window) {
    // Cancel ongoing speak speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    // Attempt to locate a premium english voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Google'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.rate = 0.9; // Slightly slower for clear learning
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Speech Synthesis is not supported in this browser.");
  }
}
