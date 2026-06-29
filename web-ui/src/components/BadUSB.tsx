import { useState, useEffect } from 'react';
import { ArrowLeft, Usb, Play, Save, Folder, Trash2, BookOpen } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const DEFAULT_PAYLOAD = `REM Exemplo: abrir calculadora no Windows
GUI r
DELAY 500
STRING calc
DELAY 200
ENTER`;

interface Payload {
  name: string;
  content: string;
}

export default function BadUSBScreen({ onBack }: Props) {
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [payloads, setPayloads] = useState<Payload[]>([]);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    loadList();
  }, []);

  const log = (m: string, k: 'info'|'ok'|'err' = 'info') => {
    const ts = new Date().toLocaleTimeString();
    setOutput(prev => [...prev, `[${ts}] [${k.toUpperCase()}] ${m}`]);
  };

  const loadList = () => {
    try {
      const raw = localStorage.getItem('flipperdiy_payloads');
      if (raw) setPayloads(JSON.parse(raw));
    } catch {}
  };

  const saveList = (list: Payload[]) => {
    localStorage.setItem('flipperdiy_payloads', JSON.stringify(list));
    setPayloads(list);
  };

  const save = () => {
    const name = prompt('Nome do payload:');
    if (!name) return;
    const fname = name.endsWith('.txt') ? name : name + '.txt';
    const existing = payloads.findIndex(p => p.name === fname);
    const newList = [...payloads];
    if (existing >= 0) {
      newList[existing] = { name: fname, content: payload };
    } else {
      newList.push({ name: fname, content: payload });
    }
    saveList(newList);
    log(`Salvo: ${fname}`, 'ok');
  };

  const load = (name: string) => {
    const p = payloads.find(p => p.name === name);
    if (p) {
      setPayload(p.content);
      log(`Carregado: ${name}`, 'ok');
    }
  };

  const remove = (name: string) => {
    saveList(payloads.filter(p => p.name !== name));
    log(`Removido: ${name}`, 'info');
  };

  // Simula execução do payload (não injeta teclas, apenas mostra o que faria)
  const simulate = async () => {
    setRunning(true);
    setOutput([]);
    log('=== SIMULAÇÃO (PWA não injeta teclas) ===', 'info');
    log('Para execução real, compile o APK (ver README)', 'info');
    log('', 'info');

    const lines = payload.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('REM')) continue;

      const upper = line.toUpperCase();

      if (upper.startsWith('STRING ')) {
        const text = line.substring(7);
        log(`[STRING] Digita: "${text}"`, 'info');
      } else if (upper.startsWith('DELAY ')) {
        const ms = parseInt(line.substring(6)) || 100;
        log(`[DELAY] Aguarda ${ms}ms...`, 'info');
        await new Promise(r => setTimeout(r, Math.min(ms, 500))); // max 500ms em simulação
      } else if (upper === 'ENTER') {
        log('[ENTER] Pressiona Enter', 'info');
      } else if (upper === 'TAB') {
        log('[TAB] Pressiona Tab', 'info');
      } else if (upper === 'ESC') {
        log('[ESC] Pressiona Escape', 'info');
      } else if (upper === 'BACKSPACE') {
        log('[BACKSPACE] Pressiona Backspace', 'info');
      } else if (upper.startsWith('GUI ') || upper.startsWith('WINDOWS ')) {
        log(`[GUI+${upper.split(' ')[1]}] Pressiona Win+${upper.split(' ')[1]}`, 'info');
      } else if (upper.startsWith('CTRL ')) {
        log(`[CTRL+${upper.split(' ')[1]}] Pressiona Ctrl+${upper.split(' ')[1]}`, 'info');
      } else if (upper.startsWith('ALT ')) {
        log(`[ALT+${upper.split(' ')[1]}] Pressiona Alt+${upper.split(' ')[1]}`, 'info');
      } else if (upper.startsWith('SHIFT ')) {
        log(`[SHIFT+${upper.split(' ')[1]}] Pressiona Shift+${upper.split(' ')[1]}`, 'info');
      } else {
        log(`[???] Comando desconhecido: ${line}`, 'warn');
      }
    }
    log('', 'info');
    log('=== Fim da simulação ===', 'ok');
    setRunning(false);
  };

  return (
    <div className="tool-screen slide-in">
      <div className="tool-header">
        <div className="icon-wrap"><Usb /></div>
        <div className="info">
          <h1>BadUSB</h1>
          <p>Editor DuckyScript + simulador</p>
        </div>
        <button className="back-btn" onClick={onBack}><ArrowLeft /></button>
      </div>

      <div className="hint warn">
        <strong>Modo PWA:</strong> este é um editor de payloads DuckyScript com simulador.
        A execução real (injeção de teclas) requer o APK nativo (instruções no README)
        ou um hardware HID externo (Pro Micro / Teensy). Use para criar e testar payloads.
      </div>

      <div className="card">
        <div className="card-title">
          Editor
          <button
            className="btn btn-secondary"
            style={{ float: 'right', padding: '4px 8px', fontSize: 10 }}
            onClick={() => setShowHelp(!showHelp)}
          >
            <BookOpen size={12} /> Ajuda
          </button>
        </div>
        <textarea
          className="textarea"
          value={payload}
          onChange={e => setPayload(e.target.value)}
          spellCheck={false}
          style={{ minHeight: 200, fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
        <div className="row">
          <button className="btn btn-primary" onClick={simulate} disabled={running}>
            {running ? <><div className="spinner" /> Simulando...</> : <><Play /> Simular</>}
          </button>
          <button className="btn btn-secondary" onClick={save}><Save /> Salvar</button>
        </div>
      </div>

      {showHelp && (
        <div className="card">
          <div className="card-title">Sintaxe DuckyScript</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
            <div><span style={{ color: 'var(--accent-green)' }}>REM</span> - comentário (ignorado)</div>
            <div><span style={{ color: 'var(--accent-green)' }}>STRING</span> &lt;texto&gt; - digita texto</div>
            <div><span style={{ color: 'var(--accent-green)' }}>DELAY</span> &lt;ms&gt; - aguarda N milissegundos</div>
            <div><span style={{ color: 'var(--accent-green)' }}>ENTER / TAB / ESC / BACKSPACE</span> - teclas especiais</div>
            <div><span style={{ color: 'var(--accent-green)' }}>GUI</span> &lt;tecla&gt; - Win+tecla (ou WINDOWS)</div>
            <div><span style={{ color: 'var(--accent-green)' }}>CTRL</span> &lt;tecla&gt; - Ctrl+tecla</div>
            <div><span style={{ color: 'var(--accent-green)' }}>ALT</span> &lt;tecla&gt; - Alt+tecla</div>
            <div><span style={{ color: 'var(--accent-green)' }}>SHIFT</span> &lt;tecla&gt; - Shift+tecla</div>
          </div>
        </div>
      )}

      {payloads.length > 0 && (
        <div className="card">
          <div className="card-title">Payloads salvos ({payloads.length})</div>
          <div className="list">
            {payloads.map(p => (
              <div className="list-item" key={p.name}>
                <div className="meta" onClick={() => load(p.name)} style={{ cursor: 'pointer', flex: 1 }}>
                  <div className="title">{p.name}</div>
                  <div className="sub">{p.content.length} bytes</div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ flex: '0 0 auto', padding: '4px 10px', marginRight: 4 }}
                  onClick={() => load(p.name)}
                >
                  <Folder size={12} />
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex: '0 0 auto', padding: '4px 10px' }}
                  onClick={() => remove(p.name)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Saída da simulação</div>
        <div className="output" style={{ minHeight: 100 }}>
          {output.length === 0
            ? <span className="ts">// toque em "Simular" para ver o que o payload faria</span>
            : output.map((l, i) => <div key={i}>{l || '&nbsp;'}</div>)}
        </div>
      </div>
    </div>
  );
}
