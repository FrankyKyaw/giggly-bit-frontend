"use client";

import { motion } from "framer-motion";
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-yellow-300 to-orange-400 p-4">
      <h1 className="text-4xl font-bold mb-6 text-center text-white">Giggly Bits</h1>
      <p className="text-xl text-center mb-8 text-white max-w-md">
      Welcome to GigglyBits! 
      Experience the joy of laughter as our app detects your giggles and laughs back!
      </p>
      <motion.button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-8 py-4 text-white rounded-full font-bold text-xl shadow-lg transition-all duration-300 ${
          isRecording ? "bg-red-500" : "bg-green-500 hover:bg-green-600"
        }`}
        whileHover={isRecording ? {} : { scale: 1.05 }}
        whileTap={isRecording ? {} : { scale: 0.95 }}
      >
        {isRecording ? "Stop Recording..." : "Start Recording"}
      </motion.button>


      {laughterDetected !== null && (
        <div
          className={`mt-4 font-bold ${
            laughterDetected ? "text-green-600" : "text-gray-600"
          }`}
        >
          {laughterDetected ? "Laughter Detected! 😂" : "No Laughter Detected 😐"}
        </div>
      )}

<div className="mt-12 flex justify-center space-x-4">
        {["😂", "😆", "🤣"].map((emoji, index) => (
          <motion.span
            key={index}
            className="text-4xl"
            animate={{
              y: [0, -10, 0],
              transition: {
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse",
                delay: index * 0.2,
              },
            }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>


      {error && <div className="text-red-600 font-bold mt-4">{error}</div>}

      <audio ref={laughterSoundRef} src="/laughter.wav" preload="auto"></audio>
    </div>
  );
}
