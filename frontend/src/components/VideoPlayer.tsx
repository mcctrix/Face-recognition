import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const VideoPlayer = () => {
  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
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

  const videoPlay = async () => {
    if (canvasRef.current === undefined || videoRef.current === undefined) {
      return;
    }

    canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
      videoRef.current
    );
    const labeledFaceDescriptors = await loadLocalImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
    console.log(faceMatcher);

    const displaySize = {
      width: videoRef.current.width,
      height: videoRef.current.height,
    };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      if (!resizedDetections) return;

      const results = resizedDetections.map((d) => {
        return faceMatcher.findBestMatch(d.descriptor);
      });
      if (results.length > 0) console.log(results);

      results.forEach((result, i) => {
        if (result.label === "Manu") {
          setFound(true);
        }
        // console.log(`Matched with ${i} ${result}`);
        // const box = resizedDetections[i].detection.box;
        // const drawBox = new faceapi.draw.DrawBox(box, {
        //   label: result.toString(),
        // });
        // drawBox.draw(canvasRef.current);
      });

      canvasRef.current
        .getContext("2d")
        .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
    }, 400);
  };

  function loadLocalImages() {
    const label = ["Manu"];

    return Promise.all(
      label.map(async (label) => {
        const descriptions = [];
        for (let i = 1; i <= 4; ++i) {
          const img = await faceapi.fetchImage(`/images/${i}.jpg`);
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          descriptions.push(detections.descriptor);
        }

        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  }

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
      {found ? <p>Found</p> : <p>not found</p>}
    </>
  );
};

export default VideoPlayer;
