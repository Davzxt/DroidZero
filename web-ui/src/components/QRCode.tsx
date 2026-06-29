import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, QrCode, Scan, Camera, Download, Trash2 } from 'lucide-react';

interface Props {
  onBack: () => void;
}

interface ScannedQR {
  text: string;
  ts: number;
}

// Gerador de QR Code simples usando a API do Google Charts (fallback online)
// Como o projeto é PWA offline, vou gerar via canvas com algoritmo básico.
// Para simplicidade, vamos usar a API api.qrserver.com (gratuita, sem chave).
const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

export default function QRCodeScreen({ onBack }: Props) {
  const [mode, setMode] = useState<'scan' | 'generate'>('scan');
  const [scanning, setScanning] = useState(false);
  const [scannedText, setScannedText] = useState('');
  const [history, setHistory] = useState<ScannedQR[]>([]);
  const [generateText, setGenerateText] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [supported, setSupported] = useState(true);
  const [output, setOutput] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setSupported(false);
      log('BarcodeDetector não suportado. Use Chrome Android 83+', 'err');
    }
    return () => stopCamera();
  }, []);

  const log = (m: string, k: 'info'|'ok'|'err' = 'info') => {
    const ts = new Date().toLocaleTimeString();
    setOutput(prev => [...prev, `[${ts}] [${k.toUpperCase()}] ${m}`]);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (e: any) {
      log(`Erro ao abrir câmera: ${e.message}`, 'err');
      return false;
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const startScan = async () => {
    if (!('BarcodeDetector' in window)) {
      log('BarcodeDetector não suportado neste navegador', 'err');
      return;
    }

    const ok = await startCamera();
    if (!ok) return;

    setScanning(true);
    log('Câmera ativa. Aponte para um QR Code...', 'info');

    const detector = new (window as any).BarcodeDetector({
      formats: ['qr_code']
    });

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !streamRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const text = barcodes[0].rawValue;
          setScannedText(text);
          setHistory(prev => {
            if (prev[0]?.text === text) return prev;
            return [{ text, ts: Date.now() }, ...prev].slice(0, 20);
          });
          log(`QR Code detectado: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`, 'ok');
          stopCamera();
        }
      } catch (e) {
        // Ignora erros de detecção temporários
      }
    }, 200);
  };

  const generate = async () => {
    if (!generateText) {
      log('Digite algo para gerar o QR Code', 'err');
      return;
    }
    const url = `${QR_API}?size=300x300&data=${encodeURIComponent(generateText)}`;
    setQrImage(url);
    log('QR Code gerado', 'ok');
  };

  const downloadQR = () => {
    if (!qrImage) return;
    const a = document.createElement('a');
    a.href = qrImage;
    a.download = 'qrcode.png';
    a.target = '_blank';
    a.click();
  };

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    log('Copiado para área de transferência', 'ok');
  };

  return (
    <div className="tool-screen slide-in">
      <div className="tool-header">
        <div className="icon-wrap"><QrCode /></div>
        <div className="info">
          <h1>QR Code</h1>
          <p>Scanner (câmera) + gerador</p>
        </div>
        <button className="back-btn" onClick={onBack}><ArrowLeft /></button>
      </div>

      <div className="card">
        <div className="row">
          <button
            className={`btn ${mode === 'scan' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setMode('scan'); stopCamera(); }}
          >
            <Scan /> Scanner
          </button>
          <button
            className={`btn ${mode === 'generate' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setMode('generate'); stopCamera(); }}
          >
            <QrCode /> Gerar
          </button>
        </div>
      </div>

      {mode === 'scan' && (
        <>
          {!supported && (
            <div className="hint danger">
              <strong>Não suportado.</strong> BarcodeDetector API requer Chrome Android 83+.
              iOS Safari não suporta.
            </div>
          )}

          <div className="card">
            <div className="card-title">Scanner</div>
            {!scanning ? (
              <button className="btn btn-primary" onClick={startScan} disabled={!supported}>
                <Camera /> Iniciar câmera
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopCamera}>
                Parar
              </button>
            )}
            {scanning && (
              <div style={{ marginTop: 12, position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                <video
                  ref={videoRef}
                  style={{ width: '100%', display: 'block' }}
                  playsInline
                  muted
                />
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: '70%', height: '70%',
                  transform: 'translate(-50%, -50%)',
                  border: '2px solid var(--flipper-orange)',
                  borderRadius: 8,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                }} />
              </div>
            )}
            {scannedText && (
              <div style={{ marginTop: 12 }}>
                <div className="card-title">Última leitura</div>
                <div
                  onClick={() => copyText(scannedText)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--accent-green)',
                    background: 'var(--bg-deep)',
                    padding: 12,
                    borderRadius: 6,
                    wordBreak: 'break-all',
                    cursor: 'pointer',
                  }}
                >
                  {scannedText}
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="card">
              <div className="card-title">Histórico ({history.length})</div>
              <div className="list">
                {history.map((h, i) => (
                  <div className="list-item" key={i} onClick={() => copyText(h.text)}>
                    <QrCode size={18} color="var(--accent-green)" />
                    <div className="meta">
                      <div className="title" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                        {h.text.substring(0, 60)}{h.text.length > 60 ? '...' : ''}
                      </div>
                      <div className="sub">{new Date(h.ts).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-secondary"
                style={{ marginTop: 8 }}
                onClick={() => setHistory([])}
              >
                <Trash2 /> Limpar histórico
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'generate' && (
        <div className="card">
          <div className="card-title">Gerador</div>
          <textarea
            className="textarea"
            placeholder="Texto ou URL para gerar QR Code"
            value={generateText}
            onChange={e => setGenerateText(e.target.value)}
            style={{ minHeight: 80 }}
          />
          <button className="btn btn-primary" onClick={generate} disabled={!generateText}>
            <QrCode /> Gerar
          </button>
          {qrImage && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <img
                src={qrImage}
                alt="QR Code"
                style={{
                  maxWidth: '100%',
                  borderRadius: 8,
                  background: 'white',
                  padding: 12,
                }}
              />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={downloadQR}>
                  <Download /> Baixar
                </button>
                <button className="btn btn-secondary" onClick={() => copyText(generateText)}>
                  Copiar texto
                </button>
              </div>
            </div>
          )}
          <div className="hint" style={{ marginTop: 8 }}>
            A geração usa a API qrserver.com (requer internet). Para uso offline,
            instale a biblioteca qrcode via npm.
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Log</div>
        <div className="output">
          {output.length === 0
            ? <span className="ts">// aguardando...</span>
            : output.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
