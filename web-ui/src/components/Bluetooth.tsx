import { useState } from 'react';
import { ArrowLeft, Bluetooth, Scan, Trash2, RefreshCw, Link2, Unlink } from 'lucide-react';

interface Props {
  onBack: () => void;
}

interface BleDevice {
  id: string;
  name: string;
  rssi?: number;
  txPower?: number;
  manufacturerData?: string;
  serviceData?: string;
  connected?: boolean;
  gatt?: any;
}

export default function BluetoothScreen({ onBack }: Props) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [selected, setSelected] = useState<BleDevice | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [supported, setSupported] = useState(true);

  if (!('bluetooth' in navigator)) {
    if (supported) setSupported(false);
  }

  const log = (m: string, k: 'info'|'ok'|'err' = 'info') => {
    const ts = new Date().toLocaleTimeString();
    setOutput(prev => [...prev, `[${ts}] [${k.toUpperCase()}] ${m}`]);
  };

  const scan = async () => {
    if (!('bluetooth' in navigator)) {
      log('Web Bluetooth não suportado', 'err');
      return;
    }
    setScanning(true);
    log('Abrindo seletor de dispositivos BLE...', 'info');

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          'generic_attribute',
          'device_information',
          'battery_service',
          'heart_rate',
          'environmental_sensing',
        ],
      });

      if (device) {
        const dev: BleDevice = {
          id: device.id,
          name: device.name || 'Dispositivo sem nome',
          connected: device.gatt?.connected || false,
          gatt: device.gatt,
        };

        // Tenta ler manufacturer data via advertisement
        if (device.addEventListener) {
          device.addEventListener('advertisementreceived', (e: any) => {
            log(`Anúncio recebido: ${e.device.name} (RSSI: ${e.rssi} dBm)`, 'info');
          });
        }

        setDevices(prev => {
          const exists = prev.find(d => d.id === dev.id);
          if (exists) return prev;
          return [dev, ...prev].slice(0, 20);
        });
        log(`Dispositivo encontrado: ${dev.name}`, 'ok');
      }
    } catch (e: any) {
      if (e.name !== 'NotFoundError') {
        log(`Erro: ${e.message}`, 'err');
      } else {
        log('Seleção cancelada', 'info');
      }
    }
    setScanning(false);
  };

  const connect = async (dev: BleDevice) => {
    log(`Conectando a ${dev.name}...`, 'info');
    try {
      const server = await dev.gatt.connect();
      log('Conectado! Descobrindo serviços...', 'ok');

      const svcs = await server.getPrimaryServices();
      const svcList: any[] = [];
      for (const svc of svcs) {
        const chars = await svc.getCharacteristics();
        svcList.push({
          uuid: svc.uuid,
          name: serviceName(svc.uuid),
          characteristics: chars.map((c: any) => ({
            uuid: c.uuid,
            name: charName(c.uuid),
            properties: c.properties,
            value: null as any,
          })),
        });
      }
      setServices(svcList);
      setSelected({ ...dev, connected: true });
      log(`${svcs.length} serviço(s) encontrado(s)`, 'ok');
    } catch (e: any) {
      log(`Erro ao conectar: ${e.message}`, 'err');
    }
  };

  const disconnect = (dev: BleDevice) => {
    try {
      dev.gatt.disconnect();
      setSelected(null);
      setServices([]);
      log(`Desconectado de ${dev.name}`, 'info');
    } catch (e: any) {
      log(`Erro: ${e.message}`, 'err');
    }
  };

  const readChar = async (svcUuid: string, charUuid: string) => {
    if (!selected) return;
    try {
      const server = selected.gatt;
      const svc = await server.getPrimaryService(svcUuid);
      const char = await svc.getCharacteristic(charUuid);
      const value = await char.readValue();
      const decoded = decodeValue(value);
      log(`Leitura ${charName(charUuid)}: ${decoded}`, 'ok');

      // Atualiza UI
      setServices(prev => prev.map(s => {
        if (s.uuid !== svcUuid) return s;
        return {
          ...s,
          characteristics: s.characteristics.map((c: any) => {
            if (c.uuid !== charUuid) return c;
            return { ...c, value: decoded };
          }),
        };
      }));
    } catch (e: any) {
      log(`Erro ao ler: ${e.message}`, 'err');
    }
  };

  const decodeValue = (buffer: DataView): string => {
    if (buffer.byteLength === 0) return '(vazio)';
    // Tenta UTF-8
    try {
      const text = new TextDecoder().decode(buffer);
      if (/^[\x20-\x7E\xA0-\xFF]*$/.test(text)) return text;
    } catch {}
    // Hex
    return Array.from(new Uint8Array(buffer.buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
  };

  return (
    <div className="tool-screen slide-in">
      <div className="tool-header">
        <div className="icon-wrap"><Bluetooth /></div>
        <div className="info">
          <h1>Bluetooth</h1>
          <p>Web Bluetooth API - BLE scan</p>
        </div>
        <button className="back-btn" onClick={onBack}><ArrowLeft /></button>
      </div>

      {!supported && (
        <div className="hint danger">
          <strong>Não suportado.</strong> Web Bluetooth API requer Chrome Android 56+
          ou Chrome/Edge/Mac. iOS Safari não suporta.
        </div>
      )}

      <div className="card">
        <div className="card-title">Scanner</div>
        <div className="row">
          <button className="btn btn-primary" onClick={scan} disabled={scanning || !supported}>
            {scanning ? <><div className="spinner" /> Aguardando...</> : <><Scan /> Escanear BLE</>}
          </button>
          {devices.length > 0 && (
            <button className="btn btn-secondary" onClick={() => { setDevices([]); setSelected(null); setServices([]); }}>
              <Trash2 /> Limpar
            </button>
          )}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          O seletor BLE do Chrome só mostra dispositivos pareados ou com anúncios ativos.
          Para scan completo (todas as redes nearby) é necessário um app nativo.
        </div>
      </div>

      {devices.length > 0 && (
        <div className="card">
          <div className="card-title">{devices.length} dispositivo(s)</div>
          <div className="list">
            {devices.map(dev => (
              <div className="list-item" key={dev.id}>
                <Bluetooth size={20} color="var(--accent-blue)" />
                <div className="meta">
                  <div className="title">{dev.name}</div>
                  <div className="sub">{dev.id.substring(0, 24)}...</div>
                </div>
                {selected?.id === dev.id && selected.connected ? (
                  <button
                    className="btn btn-danger"
                    style={{ flex: '0 0 auto', padding: '6px 12px' }}
                    onClick={() => disconnect(dev)}
                  >
                    <Unlink size={14} /> Off
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary"
                    style={{ flex: '0 0 auto', padding: '6px 12px' }}
                    onClick={() => connect(dev)}
                  >
                    <Link2 size={14} /> On
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && services.length > 0 && (
        <div className="card">
          <div className="card-title">Serviços GATT - {selected.name}</div>
          <div className="list">
            {services.map(svc => (
              <div key={svc.uuid} style={{ marginBottom: 8 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--flipper-orange)',
                  marginTop: 8,
                  marginBottom: 4,
                }}>
                  {svc.name || svc.uuid}
                </div>
                {svc.characteristics.map((c: any) => (
                  <div className="list-item" key={c.uuid}>
                    <div className="meta">
                      <div className="title" style={{ fontSize: 11 }}>{c.name || c.uuid}</div>
                      <div className="sub" style={{ wordBreak: 'break-all' }}>
                        {c.value !== null ? `Valor: ${c.value}` : 'Toque para ler'}
                      </div>
                    </div>
                    {c.properties.read && (
                      <button
                        className="btn btn-secondary"
                        style={{ flex: '0 0 auto', padding: '4px 10px', fontSize: 11 }}
                        onClick={() => readChar(svc.uuid, c.uuid)}
                      >
                        <RefreshCw size={12} /> Ler
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
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

function serviceName(uuid: string): string {
  const map: Record<string, string> = {
    '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
    '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
    '0000180a-0000-1000-8000-00805f9b34fb': 'Device Information',
    '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
    '0000180d-0000-1000-8000-00805f9b34fb': 'Heart Rate',
    '0000181a-0000-1000-8000-00805f9b34fb': 'Environmental Sensing',
  };
  return map[uuid.toLowerCase()] || '';
}

function charName(uuid: string): string {
  const map: Record<string, string> = {
    '00002a00-0000-1000-8000-00805f9b34fb': 'Device Name',
    '00002a01-0000-1000-8000-00805f9b34fb': 'Appearance',
    '00002a19-0000-1000-8000-00805f9b34fb': 'Battery Level',
    '00002a29-0000-1000-8000-00805f9b34fb': 'Manufacturer Name',
    '00002a37-0000-1000-8000-00805f9b34fb': 'Heart Rate Measurement',
    '00002a6e-0000-1000-8000-00805f9b34fb': 'Temperature',
    '00002a6f-0000-1000-8000-00805f9b34fb': 'Humidity',
  };
  return map[uuid.toLowerCase()] || '';
}
