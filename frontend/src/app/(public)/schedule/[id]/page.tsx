'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function VoiceSchedulerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Mock slots pulling from Google Calendar backend logic
    setSlots([
      { id: '1', start: '2026-07-25T09:00:00+10:00', label: 'Thursday at 9 AM' },
      { id: '2', start: '2026-07-25T11:00:00+10:00', label: 'Thursday at 11 AM' },
      { id: '3', start: '2026-07-26T14:00:00+10:00', label: 'Friday at 2 PM' }
    ]);
    setLoading(false);

    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript;
        setTranscript(result);
        processVoiceCommand(result, [
            { id: '1', label: 'Thursday at 9 AM' },
            { id: '2', label: 'Thursday at 11 AM' },
            { id: '3', label: 'Friday at 2 PM' }
        ]);
      };

      recognitionRef.current.onend = () => {
        setListening(false);
      };
    }
  }, []);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceAssistant = () => {
    if (!initialized.current) {
        speak("Hi! I'm your scheduling assistant. You can choose from Thursday at 9 AM, Thursday at 11 AM, or Friday at 2 PM. Which one works best for you?");
        initialized.current = true;
    }
    
    if (!recognitionRef.current) {
      alert("Voice recognition requires Chrome/Edge.");
      return;
    }
    setListening(true);
    try {
        recognitionRef.current.start();
    } catch(e) {}
  };

  const processVoiceCommand = (command: string, availableSlots: any[]) => {
    const lowerCmd = command.toLowerCase();
    let selectedSlot = null;

    if (lowerCmd.includes('thursday') && lowerCmd.includes('9')) {
      selectedSlot = availableSlots[0];
    } else if (lowerCmd.includes('thursday') && lowerCmd.includes('11')) {
      selectedSlot = availableSlots[1];
    } else if (lowerCmd.includes('friday') && lowerCmd.includes('2')) {
      selectedSlot = availableSlots[2];
    }

    if (selectedSlot) {
      speak(`Great! I've booked your interview for ${selectedSlot.label}. We will send you a calendar invite shortly.`);
      setTimeout(() => alert("Booking confirmed! API Call to Calendar triggered."), 3000);
    } else {
      speak("I'm sorry, I didn't quite catch that. Could you repeat the day and time?");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
      </div>
      
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Voice Scheduling Assistant</h1>
      <p className="text-slate-600 mb-8">Click the microphone and tell us which slot works best for you.</p>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-8">
          <h3 className="font-semibold text-slate-800 mb-4">Available Slots:</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {slots.map(s => (
              <div key={s.id} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={startVoiceAssistant}
          className={`px-8 py-4 rounded-full font-bold text-lg text-white transition-all shadow-lg ${listening ? 'bg-red-500 animate-pulse hover:bg-red-600' : 'bg-primary hover:bg-primary-hover'}`}
        >
          {listening ? 'Listening...' : 'Start Voice Assistant'}
        </button>
        
        {transcript && (
          <div className="mt-8 p-4 bg-slate-50 rounded-xl text-slate-600 italic">
            "{transcript}"
          </div>
        )}
      </div>
    </div>
  );
}
