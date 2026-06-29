#!/usr/bin/env python3
"""
Servidor HTTP simples para rodar a Web UI do FlipperDIY sem Node.js.

Uso:
    python serve.py

Depois acesse pelo celular (na mesma rede WiFi):
    http://IP_DO_SEU_COMPUTADOR:8000/

O Python já vem instalado no Mac e Linux. No Windows, baixe em:
    https://www.python.org/downloads/
"""
import http.server
import socketserver
import os
import socket
import sys

PORT = 8000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')

if not os.path.isdir(DIRECTORY):
    print(f'\n[ERRO] Pasta "{DIRECTORY}" não encontrada.')
    print('Você precisa primeiro gerar o build da Web UI.')
    print('Opção 1: Instalar Node.js e rodar "npm install && npm run build"')
    print('Opção 2: Pedir para o GLM gerar o build para você')
    sys.exit(1)


def get_local_ip():
    """Descobre o IP local do computador na rede WiFi."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # CORS headers para acessar de qualquer dispositivo da rede
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        # MIME type correto para JS modules
        super().end_headers()

    def guess_type(self, path):
        mimetype = super().guess_type(path)
        if path.endswith('.js'):
            return 'text/javascript'
        return mimetype


class QuietServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == '__main__':
    ip = get_local_ip()
    url_local = f'http://localhost:{PORT}'
    url_network = f'http://{ip}:{PORT}'

    print('=' * 60)
    print('  🐬 FlipperDIY - Servidor Web')
    print('=' * 60)
    print(f'\n  Servindo pasta: {DIRECTORY}')
    print(f'\n  Acesse no CELULAR (mesma rede WiFi):')
    print(f'    👉 {url_network}')
    print(f'\n  Acesse no PRÓPRIO PC:')
    print(f'    👉 {url_local}')
    print(f'\n  [Ctrl+C para parar]\n')
    print('=' * 60)

    with QuietServer(('0.0.0.0', PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\nServidor encerrado. Até mais! 🐬')
            sys.exit(0)
