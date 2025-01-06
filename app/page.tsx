"use client"

import { useState, useRef, useEffect } from "react";

interface LaughterDetectionResponse {
  result: string;
  error?: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [laughterDetected, setLaughterDetected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLaughterPlaying, setIsLaughterPlaying] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const laughterSoundRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const setupAudioContext = async (stream: MediaStream) => {
    try {
      // Initialize audio context and nodes
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);

      // Connect the nodes
      sourceNodeRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);

      // Initially set gain to 1 (normal volume)
      gainNodeRef.current.gain.value = 1;
    } catch (err) {
      console.error("Error setting up audio context:", err);
      setError("Error setting up audio processing.");
    }
  };

  const handleContinuousRecording = async () => {
    try {
      const audioChunks: BlobPart[] = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for input control
      await setupAudioContext(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Only process audio if we're not currently playing laughter
        if (!isLaughterPlaying) {
          const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.wav");

          try {
            const response = await fetch("http://127.0.0.1:5000/upload", {
              method: "POST",
              body: formData,
            });

            const data: LaughterDetectionResponse = await response.json();
            const isLaughter = data.result === "Laughter detected!";
            setLaughterDetected(isLaughter);

            if (isLaughter) {
              startLaughterPlayback();
            }
          } catch (err) {
            console.error("Error during laughter detection:", err);
            setError("Error detecting laughter.");
          }
        }

        // Start new recording if still in recording state
        if (isRecording) {
          audioChunks.length = 0;
          mediaRecorder.start();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Set up interval to stop and restart recording every 3 seconds
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 3000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access the microphone.");
    }
  };

  const startLaughterPlayback = () => {
    if (laughterSoundRef.current && !isLaughterPlaying) {
      // Mute the input before playing
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 0;
      }
      
      laughterSoundRef.current.loop = true;
      laughterSoundRef.current.play().catch((err) => {
        console.error("Error playing audio:", err);
        setError("Error playing laughter sound.");
      });
      setIsLaughterPlaying(true);

      // Stop the laughter after 5 seconds
      setTimeout(() => {
        stopLaughterPlayback();
      }, 5000);
    }
  };

  const stopLaughterPlayback = () => {
    if (laughterSoundRef.current) {
      laughterSoundRef.current.pause();
      laughterSoundRef.current.currentTime = 0;
      setIsLaughterPlaying(false);

      // Unmute the input after stopping
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 1;
      }
    }
  };

  const startRecording = () => {
    handleContinuousRecording();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopLaughterPlayback();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      // Clean up MediaRecorder and tracks
      const tracks = mediaRecorderRef.current.stream.getTracks();
      tracks.forEach(track => track.stop());

      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current) {
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      stopLaughterPlayback();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Laughter Detector</h1>

      <div className="mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop Recording
          </button>
        )}
      </div>

      {laughterDetected !== null && (
        <div
          className={`mt-4 font-bold ${
            laughterDetected ? "text-green-600" : "text-gray-600"
          }`}
        >
          {laughterDetected ? "Laughter Detected!" : "No Laughter Detected"}
        </div>
      )}

      {error && <div className="text-red-600 font-bold mt-4">{error}</div>}

      <audio ref={laughterSoundRef} src="/laughter.wav" preload="auto"></audio>
    </div>
  );
}