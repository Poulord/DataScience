from http.server import HTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import argparse


class QuietHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Evita caché agresiva en navegadores mientras se itera el desarrollo
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Servidor HTTP simple para el dashboard")
    parser.add_argument("--host", default="0.0.0.0", help="Interfaz a la que enlazar (0.0.0.0 para accesos locales)")
    parser.add_argument("--port", type=int, default=8000, help="Puerto de escucha")
    parser.add_argument(
        "--directory",
        default=Path(__file__).parent,
        type=Path,
        help="Directorio raíz desde el que se sirven los archivos",
    )
    args = parser.parse_args()

    root_dir = args.directory.resolve()
    handler = partial(QuietHTTPRequestHandler, directory=root_dir)
    httpd = HTTPServer((args.host, args.port), handler)

    print(f"Sirviendo {root_dir} en http://{args.host}:{args.port} (Ctrl+C para salir)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido")
