// pages/index.js
import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [glucose, setGlucose] = useState(null);
  const [glucoseHistory, setGlucoseHistory] = useState([]);
  const [timeLabels, setTimeLabels] = useState([]);
  const [status, setStatus] = useState('Initializing...');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      captureAndSend();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Glucose Level (mg/dL)',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.2,
            borderWidth: 2,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 70,
              max: 180
            }
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.data.labels = timeLabels;
      chartInstance.current.data.datasets[0].data = glucoseHistory;
      chartInstance.current.update();
    }
  }, [glucoseHistory, timeLabels]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.warn('Play error:', err));
    });
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
      const g = result.glucose;
      setGlucose(g);
      const elapsed = ((Date.now() - startTime.current) / 1000).toFixed(0);
      setGlucoseHistory(prev => [...prev.slice(-19), g]);
      setTimeLabels(prev => [...prev.slice(-19), `${elapsed}s`]);
      setStatus('System Active');
    } catch (error) {
      console.error('Error fetching glucose:', error);
      setStatus('Backend Offline');
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-4">Contactless Glucose Monitoring</h1>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-4">
          <div className="border rounded p-2">
            <video ref={videoRef} width="100%" height="240" className="rounded" muted autoPlay playsInline></video>
            <canvas ref={canvasRef} width="320" height="240" className="hidden" />
          </div>

          <div className="border rounded p-2">
            <div className="h-64">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        </div>

        <div className="w-full md:w-72 space-y-4">
          <div className="border rounded p-4 text-center">
            <div className="text-sm text-gray-500">Status</div>
            <div className={`text-lg font-semibold ${status.includes('Active') ? 'text-green-600' : 'text-red-600'}`}>{status}</div>
          </div>

          <div className="border rounded p-4 text-center">
            <div className="text-sm text-gray-500">Glucose</div>
            <div className={`text-3xl font-bold ${glucose > 140 ? 'text-orange-500' : glucose < 70 ? 'text-red-500' : 'text-green-600'}`}>
              {glucose ? `${glucose.toFixed(1)} mg/dL` : '--'}
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="font-semibold mb-2">Instructions</div>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Ensure good lighting</li>
              <li>Face the camera directly</li>
              <li>Keep your eyes open</li>
              <li>Stay still</li>
              <li>Wait ~20 seconds for data collection</li>
            </ul>
            <div className="text-xs text-gray-500 mt-2">
              Simulation only. Not for medical use.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
