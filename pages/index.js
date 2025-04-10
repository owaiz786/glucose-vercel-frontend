// pages/index.js
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [glucose, setGlucose] = useState(null);
  const [status, setStatus] = useState('Initializing...');
  const [trend, setTrend] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const startTime = useRef(Date.now());

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    });

    const interval = setInterval(() => {
      captureAndSend();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const captureAndSend = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('https://your-flask-api-url/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 })
      });
      const result = await response.json();
      if (result.glucose) {
        const elapsed = ((Date.now() - startTime.current) / 1000).toFixed(0);
        setGlucose(result.glucose);
        setStatus('System Active');
        setTrend(prev => [...prev.slice(-19), result.glucose]);
        setTimestamps(prev => [...prev.slice(-19), `${elapsed}s`]);
      } else {
        setStatus(result.message || 'Collecting data...');
      }
    } catch (err) {
      setStatus('Backend Offline');
    }
  };

  const getGlucoseStatus = () => {
    if (!glucose) return 'Waiting...';
    if (glucose < 70) return 'Low';
    if (glucose > 140) return 'High';
    return 'Normal';
  };

  const getStatusColor = () => {
    if (!glucose) return 'text-secondary';
    if (glucose < 70) return 'text-danger';
    if (glucose > 140) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="container py-4">
      <h1 className="text-center mb-4">Contactless Glucose Monitoring</h1>

      <div className="row">
        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-header">Camera Feed</div>
            <div className="card-body text-center">
              <video
                ref={videoRef}
                width="100%"
                height="240"
                muted
                autoPlay
                playsInline
                style={{ borderRadius: '8px', border: '1px solid #ccc' }}
              ></video>
              <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }}></canvas>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Glucose Trend</div>
            <div className="card-body">
              <ul className="list-group">
                {trend.map((g, i) => (
                  <li key={i} className="list-group-item d-flex justify-content-between">
                    <span>{timestamps[i]}</span>
                    <span>{g.toFixed(1)} mg/dL</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card mb-3">
            <div className="card-header">Current Glucose Level</div>
            <div className="card-body text-center">
              <h2 className={`display-5 ${getStatusColor()}`}>{glucose ? `${glucose.toFixed(1)} mg/dL` : '--'}</h2>
              <p>{getGlucoseStatus()}</p>
              <div className="text-muted small">{status}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Instructions</div>
            <div className="card-body">
              <ul>
                <li>Ensure good lighting</li>
                <li>Face the camera directly</li>
                <li>Keep eyes open & stay still</li>
                <li>Wait ~20 seconds for results</li>
              </ul>
              <div className="alert alert-info mt-3">
                <small>This is a simulation. Not for medical use.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
