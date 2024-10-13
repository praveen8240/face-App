import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera,  Volume2,Eye,EyeOff } from 'lucide-react';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelLoadingError, setModelLoadingError] = useState<string | null>(null);
  const [headMovementDetected, setHeadMovementDetected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const SMALL_TURN_THRESHOLD = 40;
  const TALKING_THRESHOLD = 5;
  let previousNosePosition = { x: 0, y: 0 };
  let previousMouthOpenness = 0;

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = `${window.location.origin}/models`;
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

        if (detections.length > 0) {
          const detection = detections[0];
          const landmarks = detection.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          // Head movement check
          const nose = landmarks.getNose()[0];
          const noseMovement = Math.sqrt(
            Math.pow(nose.x - previousNosePosition.x, 2) + Math.pow(nose.y - previousNosePosition.y, 2)
          );
          setHeadMovementDetected(noseMovement > SMALL_TURN_THRESHOLD);
          previousNosePosition = { x: nose.x, y: nose.y };

          // Talking detection
          const mouth = landmarks.getMouth();
          const topLip = mouth[14];
          const bottomLip = mouth[18];
          const mouthOpenness = Math.abs(topLip.y - bottomLip.y);
          const mouthMovement = Math.abs(mouthOpenness - previousMouthOpenness);
          setIsTalking(mouthMovement > TALKING_THRESHOLD);
          previousMouthOpenness = mouthOpenness;
        }


      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col items-center justify-center p-4 space-y-6">
      {!isModelLoaded && !modelLoadingError && (
        <p className="text-lg font-medium text-gray-700 animate-pulse">
          Loading face detection models...
        </p>
      )}
      {modelLoadingError && (
        <p className="text-lg font-medium text-red-600 bg-red-100 px-4 py-2 rounded-md">
          {modelLoadingError}
        </p>
      )}
      {isModelLoaded && (
        <div className="">
          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              muted
              onPlay={handleVideoPlay}
              width="720"
              height="560"
              className="rounded-xl"
            />
            <canvas ref={canvasRef} className={`${showLandmarks? 'absolute' : 'hidden'}  top-0 left-0`} />
          </div>
          <div className="mt-2 max-w-md">
            <p className="flex items-center text-md font-medium text-gray-800">
              <Camera className="mr-3 text-primary" /> 
              Faces detected: <span className="ml-2 font-bold text-primary">{faceCount}</span>
            </p>
            <p className="flex items-center text-md font-medium text-gray-800">
              <span className="mr-3">👤</span> 
              Head Movement: 
              <span className={`ml-2 font-bold ${headMovementDetected ? 'text-green-600' : 'text-yellow-600'}`}>
                {headMovementDetected ? 'Moved Head' : 'No Movement'}
              </span>
            </p>
            <p className="flex items-center text-md font-medium text-gray-800">
              <Volume2 className="mr-3 text-primary" /> 
              Talking: 
              <span className={`ml-2 font-bold ${isTalking ? 'text-green-600' : 'text-yellow-600'}`}>
                {isTalking ? 'Yes' : 'No'}
              </span>
            </p>
            <button
              onClick={() => setShowLandmarks((prev) => !prev)}
              className="px-4 py-2 mt-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {showLandmarks ? <EyeOff className="inline mr-2" /> : <Eye className="inline mr-2" />}
              {showLandmarks ? 'Hide Landmarks' : 'Show Landmarks'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;