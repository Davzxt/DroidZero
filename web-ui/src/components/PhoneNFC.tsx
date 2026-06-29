import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Nfc, Scan, Tag, Eraser, PenLine } from 'lucide-react';

interface Props {
  onBack: () => void;
}

interface NfcRecord {
  type: string;
  data: string;
  encoding?: string;
  lang?: string;
}

export default function PhoneNFC({ onBack }: Props) {
  const [scanning, setScanning] = useState(false);
  const [writing, setWriting] = useState(false);
  const [lastRead, setLastRead] = useState<{ uid: string; records: NfcRecord[] } | null>(null);
  const [writeText, setWriteText] = useState('');
  const [supported, setSupported] = useState(true);
  const [output, setOutput] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!('NDEFReader' in window)) {
      setSupported(false);
      log('Web NFC API não suportada neste navegador', 'err');
      log('Use Chrome Android 81+', 'info');
    }
  }, []);

  const log = (m: string, k: 'info'|'ok'|'err' = 'info') => {
    const ts = new Date().toLocaleTimeString();
    setOutput(prev => [...prev, `[${ts}] [${k.toUpperCase()}] ${m}`]);
  };

  const decodeRecord = (record: any): NfcRecord => {
    const encoding = record.encoding || 'utf-8';
    const decoder = new TextDecoder(encoding);
    switch (record.recordType) {
      case 'text':
        return { type: 'text', data: decoder.decode(record.data), encoding };
      case 'url':
        return { type: 'url', data: decoder.decode(record.data) };
      case 'empty':
        return { type: 'empty', data: '' };
      case 'mime':
        return { type: `mime:${record.mediaType}`, data: `[${record.data.byteLength} bytes]` };
      default:
        // Tenta decodificar como texto
        try {
          return { type: record.recordType, data: decoder.decode(record.data) };
        } catch {
          return { type: record.recordType, data: `[${record.data.byteLength} bytes binário]` };
        }
    }
  };

  const scan = async () => {
    if (!('NDEFReader' in window)) return;
    setScanning(true);
    setLastRead(null);
    log('Aproxime a tag NFC do celular...', 'info');

    try {
      const reader = new (window as any).NDEFReader();
      abortRef.current = new AbortController();

      reader.addEventListener('reading', (event: any) => {
        const uid = Array.from(event.serialNumber)
          .map((b: number) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(':');
        const records: NfcRecord[] = [];

        if (event.message && event.message.records) {
          for (const record of event.message.records) {
            records.push(decodeRecord(record));
          }
        }

        setLastRead({ uid, records });
        log(`Tag detectada! UID: ${uid}`, 'ok');
        log(`${records.length} registro(s) lido(s)`, 'ok');

        // Para o scan após a primeira leitura
        abortRef.current?.abort();
        setScanning(false);
      });

      reader.addEventListener('error', (e: any) => {
        log(`Erro: ${e.message || 'desconhecido'}`, 'err');
      });

      await reader.scan({ signal: abortRef.current.signal });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        log(`Erro: ${e.message}`, 'err');
      }
    }
    setScanning(false);
  };

  const stopScan = () => {
    abortRef.current?.abort();
    setScanning(false);
    log('Scan cancelado', 'info');
  };

  const write = async () => {
    if (!writeText) {
      log('Digite algo para escrever', 'err');
      return;
    }
    if (!('NDEFWriter' in window) && !('NDEFReader' in window)) {
      log('Web NFC não suportada', 'err');
      return;
    }

    setWriting(true);
    log('Aproxime uma tag NFC gravável...', 'info');
    log('A tag será sobrescrita!', 'warn');

    try {
      const writer = new (window as any).NDEFWriter();
      await writer.write(writeText);
      log(`Escrito com sucesso: "${writeText}"`, 'ok');
    } catch (e: any) {
      log(`Erro ao escrever: ${e.message}`, 'err');
    }
    setWriting(false);
  };

  const erase = async () => {
    if (!confirm('Tem certeza? Isso vai apagar a tag NFC.')) return;
    setWriting(true);
    log('Aproxime a tag para apagar...', 'info');
    try {
      const writer = new (window as any).NDEFWriter();
      await writer.write({ records: [{ recordType: 'empty' }] });
      log('Tag apagada', 'ok');
    } catch (e: any) {
      log(`Erro: ${e.message}`, 'err');
    }
    setWriting(false);
  };

  const copyUid = () => {
    if (lastRead?.uid) {
      navigator.clipboard?.writeText(lastRead.uid);
      log('UID copiado para a área de transferência', 'ok');
    }
  };

  return (
    <div className="tool-screen slide-in">
      <div className="tool-header">
        <div className="icon-wrap"><Nfc /></div>
        <div className="info">
          <h1>NFC</h1>
          <p>Web NFC API - chip do celular</p>
        </div>
        <button className="back-btn" onClick={onBack}><ArrowLeft /></button>
      </div>

      {!supported && (
        <div className="hint danger">
          <strong>Não suportado.</strong> Web NFC API requer Chrome Android 81+.
          iOS Safari não suporta. Verifique se o NFC está ativado nas configurações do celular.
        </div>
      )}

      <div className="card">
        <div className="card-title">Leitura</div>
        <div className="row">
          {!scanning ? (
            <button className="btn btn-primary" onClick={scan} disabled={!supported}>
              <Scan /> Ler Tag
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopScan}>
              <div className="spinner" /> Parar
            </button>
          )}
        </div>
        {scanning && (
          <div className="loading-overlay">
            <Nfc size={48} color="var(--flipper-orange)" />
            <span>Aproxime a tag...</span>
          </div>
        )}
        {lastRead && (
          <div style={{ marginTop: 12 }}>
            <div className="card-title">UID</div>
            <div
              onClick={copyUid}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                color: 'var(--accent-green)',
                background: 'var(--bg-deep)',
                padding: 12,
                borderRadius: 6,
                wordBreak: 'break-all',
                cursor: 'pointer',
              }}
            >
              {lastRead.uid} <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>(toque para copiar)</span>
            </div>
            <div className="card-title" style={{ marginTop: 12 }}>Registros</div>
            <div className="list">
              {lastRead.records.map((r, i) => (
                <div className="list-item" key={i}>
                  <Tag size={18} color="var(--accent-blue)" />
                  <div className="meta">
                    <div className="title">{r.type}</div>
                    <div className="sub" style={{ wordBreak: 'break-all' }}>{r.data || '(vazio)'}</div>
                  </div>
                </div>
              ))}
              {lastRead.records.length === 0 && (
                <div className="list-item">
                  <div className="meta">
                    <div className="title">Tag vazia</div>
                    <div className="sub">Sem registros NDEF</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Gravar texto</div>
        <input
          className="input"
          placeholder="Texto para gravar na tag"
          value={writeText}
          onChange={e => setWriteText(e.target.value)}
        />
        <div className="row">
          <button className="btn btn-primary" onClick={write} disabled={!supported || writing || !writeText}>
            {writing ? <><div className="spinner" /> Gravando...</> : <><PenLine /> Gravar</>}
          </button>
          <button className="btn btn-danger" onClick={erase} disabled={!supported || writing}>
            <Eraser /> Apagar
          </button>
        </div>
      </div>

      <div className="hint">
        <strong>Como usar:</strong>
        <ol style={{ margin: '8px 0 0 16px', lineHeight: 1.8 }}>
          <li>Ative o NFC em Configurações → Conexões → NFC</li>
          <li>Toque em "Ler Tag" e aproxime a tag</li>
          <li>Para gravar, digite o texto e aproxime a tag</li>
          <li>Tag precisa ser gravável (NTAG213/215, Mifare Ultralight)</li>
        </ol>
      </div>

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
