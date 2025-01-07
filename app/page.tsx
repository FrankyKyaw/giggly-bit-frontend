"use client";

import { useState, useRef, useEffect } from "react";

interface LaughterDetectionResponse {
  result: string;
  error?: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [laughterDetected, setLaughterDetected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const laughterSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const isRecordingRef = useRef(false);

  const handleRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        audioChunksRef.current = []; // Clear chunks for the next recording

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.wav");

        try {
          const response = await fetch("https://giggly-bit-664006500279.us-central1.run.app/upload", {
            method: "POST",
            body: formData,
          });
          const data: LaughterDetectionResponse = await response.json();
          const isLaughter = data.result === "Laughter detected!";
          setLaughterDetected(isLaughter);

          if (isLaughter) {
            laughterSoundRef.current?.play();
          }
        } catch (err) {
          console.error("Error during laughter detection:", err);
          setError("Error detecting laughter.");
        }

        if (isRecordingRef.current) {
          mediaRecorder.start();
          setTimeout(() => mediaRecorder.stop(), 3000);
        }
      };

      // Start recording
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000); // Automatically stop every 3 seconds
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access the microphone.");
    }
  };

  const startRecording = () => {
    isRecordingRef.current = true;
    setIsRecording(true);
    handleRecording();
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
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
