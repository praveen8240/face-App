import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Smartphone } from 'lucide-react';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [isAttentive, setIsAttentive] = useState(false);
  const [otherDevices, setOtherDevices] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelLoadingError, setModelLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "http://localhost:5173"+"/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        console.log('Models loaded successfully');
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading models:', error);
        setModelLoadingError(`Failed to load face detection models: ${error.message}`);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (isModelLoaded && videoRef.current) {
      startVideo();
    }
  }, [isModelLoaded]);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Error accessing the camera:", err);
        setModelLoadingError(`Error accessing the camera: ${err.message}`);
      });
  };

  const handleVideoPlay = () => {
    setInterval(async () => {
      if (canvasRef.current && videoRef.current) {
        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(videoRef.current);
        const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
        faceapi.matchDimensions(canvasRef.current, displaySize);

        const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);

        setFaceCount(detections.length);

        // Simple attentiveness check (if the person is looking straight)
        const isAttentive = detections.some(detection => {
          const landmarks = detection.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const eyeDistance = faceapi.euclideanDistance([leftEye[0].x, leftEye[0].y], [rightEye[3].x, rightEye[3].y]);
          const faceWidth = detection.detection.box.width;
          return eyeDistance / faceWidth > 0.2; // Threshold for attentiveness
        });

        setIsAttentive(isAttentive);

        // Simulating other device detection (random for demonstration)
        setOtherDevices(Math.floor(Math.random() * 3));
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Face Detection App</h1>
      {!isModelLoaded && !modelLoadingError && <p className="text-lg mb-4">Loading face detection models...</p>}
      {modelLoadingError && <p className="text-lg mb-4 text-red-500">{modelLoadingError}</p>}
      {isModelLoaded && (
        <>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              onPlay={handleVideoPlay}
              width="720"
              height="560"
              className="rounded-lg shadow-lg"
            />
            <canvas ref={canvasRef} className="absolute top-0 left-0" />
          </div>
          <div className="mt-4 bg-white p-4 rounded-lg shadow-md">
            <p className="flex items-center"><Camera className="mr-2" /> Faces detected: {faceCount}</p>
            <p className="flex items-center mt-2">Attentive: {isAttentive ? 'Yes' : 'No'}</p>
            <p className="flex items-center mt-2"><Smartphone className="mr-2" /> Other devices: {otherDevices}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default App;