import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import "./App.css";

function App() {
  return <VideoPlayer />;
}
const VideoPlayer = () => {
  const [loading, setLoading] = useState(true);
  const videoRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    ]).then(() => {
      setLoading(false);
      startVideo();
    });
  }, []);
  function startVideo() {
    navigator.getUserMedia(
      { video: {} },
      (stream) => (videoRef.current.srcObject = stream),
      (err) => console.error(err)
    );
  }
  const videoPlay = () => {
    if (canvasRef.current === undefined || videoRef.current === undefined) {
      return;
    }
    canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
      videoRef.current
    );

    const displaySize = {
      width: videoRef.current.width,
      height: videoRef.current.height,
    };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvasRef.current
        .getContext("2d")
        .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
    }, 100);
  };

  return (
    <>
      <main className="main">
        <video
          id="video"
          ref={videoRef}
          onPlay={videoPlay}
          width="720"
          height="560"
          autoPlay
          muted
        ></video>
        <canvas ref={canvasRef}></canvas>
      </main>
      {loading ? <p>Loading</p> : <p>Loaded</p>}
    </>
  );
};

export default App;
