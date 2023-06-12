import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const VideoPlayer2 = () => {
  const [loading, setLoading] = useState(true);

  const [imagesMatched, setImagesMatched] = useState([]);

  const videoRef = useRef<HTMLElement>();
  const canvasRef = useRef<HTMLElement>();

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
    setImagesMatched([]);
    let labeledFaceDescriptors = await loadLocalImages();

    const displaySize = {
      width: videoRef.current.width,
      height: videoRef.current.height,
    };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    setInterval(async () => {
      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
      const currentFrameDetections = await faceapi
        .detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(
        currentFrameDetections,
        displaySize
      );
      if (!resizedDetections) return;

      const results = resizedDetections.map((d) => {
        return faceMatcher.findBestMatch(d.descriptor);
      });
      labeledFaceDescriptors = labeledFaceDescriptors.filter((face) => {
        let found = false;
        results.forEach((res) => {
          if (res.label == face.label) {
            found = true;
          }
        });
        if (found) {
          return false;
        }
        return true;
      });
      //   if (results.length > 0) console.log(results);

      results.forEach((result, i) => {
        // console.log(result);
        // console.log(`Matched with ${i} ${result}`);
        if (result.label !== "unknown") {
          const data = { result: result.label };

          setImagesMatched((prev) => [...prev, data]);
        }

        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: result.toString(),
        });
        drawBox.draw(canvasRef.current);
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
    // Name of images in the public/images folder
    const label = [1, 2, 3, 4, 5, 6, 7, 8];

    return Promise.all(
      label.map(async (label) => {
        const descriptions = [];

        const img = await faceapi.fetchImage(`/images/${label}.jpg`);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detections?.descriptor) {
          descriptions.push(detections.descriptor);
        }

        return new faceapi.LabeledFaceDescriptors(
          label.toString(),
          descriptions
        );
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
      <ul>
        {imagesMatched.map((image) => (
          <li key={image.result}>Matched with {image.result}.jpg</li>
        ))}
      </ul>
    </>
  );
};

export default VideoPlayer2;
