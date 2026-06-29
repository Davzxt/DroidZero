import { useState, useEffect } from 'react';
import { ArrowLeft, Settings as SettingsIcon, Usb, RefreshCw, Terminal, Activity, Power } from 'lucide-react';
import { useSerial } from '../hooks/useSerial';
import { CMD } from '../lib/protocol';

interface Props {
  onBack: () => void;
  serial: ReturnType<typeof useSerial>;
}

export default function SettingsScreen({ onBack, serial }: Props) {
  const [identity, setIdentity] = useState('');
  const [showLog, setShowLog] = useState(true);
  const [buttonPresses, setButtonPresses] = useState(0);

  useEffect(() => {
    const off = serial.onEvent(e => {
      if (e.type === 'EVT' && e.kind === 'BUTTON') {
        setButtonPresses(p => p + 1);
      }
    });
    return off;
  }, [serial]);

  const ping = async () => {
    try {
      const r = await serial.send(CMD.PING);
      if (r.type === 'OK') {
        alert('✓ PONG recebido! Arduino respondendo.');
      } else {
        alert(`Erro: ${(r as any).msg}`);
      }
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    }
  };

  const identify = async () => {
    try {
      const r = await serial.send(CMD.IDENTIFY);
      if (r.type === 'OK') setIdentity(r.data);
    } catch (e: any) {
      setIdentity(`Erro: ${e.message}`);
    }
  };

  const ledOn  = async () => { try { await serial.send(CMD.LED_ON);  } catch {} };
  const ledOff = async () => { try { await serial.send(CMD.LED_OFF); } catch {} };
  const ledBlink = async () => { try { await serial.send(CMD.LED_BLINK, [5]); } catch {} };

  return (
    <div className="tool-screen slide-in">
      <div className="tool-header">
        <div className="icon-wrap"><SettingsIcon /></div>
        <div className="info">
          <h1>Configurações</h1>
          <p>Conexão e diagnóstico</p>
        </div>
        <button className="back-btn" onClick={onBack}><ArrowLeft /></button>
      </div>

      <div className="card">
        <div className="card-title">Status da Conexão</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`status-pill ${serial.connected ? 'ok' : 'error'}`}>
            {serial.connected ? '● Arduino conectado' : '○ Desconectado'}
          </span>
          {serial.hasWebSerial && <span className="status-pill ok">Web Serial OK</span>}
          {!serial.hasWebSerial && <span className="status-pill error">Web Serial indisponível</span>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Conectar Arduino (via OTG)</div>
        {!serial.connected ? (
          <>
            <button className="btn btn-primary" onClick={serial.connect} disabled={!serial.hasWebSerial}>
              <Usb /> Conectar
            </button>
            <div className="hint" style={{ marginTop: 8 }}>
              <strong>Passo a passo:</strong>
              <ol style={{ margin: '6px 0 0 16px', lineHeight: 1.8 }}>
                <li>Plugue o cabo OTG no celular</li>
                <li>Plugue o Arduino na outra ponta</li>
                <li>Toque em "Conectar"</li>
                <li>Selecione o Arduino na lista</li>
                <li>Toque em "Conectar" na caixa</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="row">
            <button className="btn btn-danger" onClick={serial.disconnect}>
              <Power /> Desconectar
            </button>
            <button className="btn btn-secondary" onClick={serial.connect}>
              <RefreshCw /> Trocar porta
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Diagnóstico</div>
        <div className="row">
          <button className="btn btn-secondary" onClick={ping} disabled={!serial.connected}>
            <Activity /> PING
          </button>
          <button className="btn btn-secondary" onClick={identify} disabled={!serial.connected}>
            <Terminal /> Identificar
          </button>
        </div>
        {identity && (
          <div className="output" style={{ marginTop: 8 }}>{identity}</div>
        )}
        {buttonPresses > 0 && (
          <div className="hint" style={{ marginTop: 8 }}>
            Botão físico pressionado <strong>{buttonPresses}x</strong> desde a conexão.
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">LED Status (A0)</div>
        <div className="row">
          <button className="btn btn-secondary" onClick={ledOn}  disabled={!serial.connected}>Ligar</button>
          <button className="btn btn-secondary" onClick={ledOff} disabled={!serial.connected}>Desligar</button>
          <button className="btn btn-primary"   onClick={ledBlink} disabled={!serial.connected}>Piscar 5x</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Log Serial ({serial.log.length})
          <button
            className="btn btn-secondary"
            style={{ float: 'right', padding: '4px 8px', fontSize: 10 }}
            onClick={() => setShowLog(!showLog)}
          >
            {showLog ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {showLog && (
          <div className="output" style={{ maxHeight: 300 }}>
            {serial.log.length === 0
              ? <span className="ts">// sem atividade</span>
              : serial.log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
        <button className="btn btn-secondary" onClick={serial.clearLog} style={{ marginTop: 8 }} disabled={serial.log.length === 0}>
          <RefreshCw /> Limpar log
        </button>
      </div>

      <div className="hint">
        <strong>Sobre o FlipperDIY v2.0:</strong> projeto PWA de hacking ético.
        Arduino + celular via OTG. Todas as ferramentas (NFC, Bluetooth, QR,
        BadUSB) rodam no próprio celular via APIs web modernas. Use apenas em
        sistemas próprios ou com autorização explícita.
      </div>
    </div>
  );
}
