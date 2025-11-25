# Dashboard de riesgo de sequía 2022

Dashboard web en HTML, CSS y JavaScript que analiza la serie temporal de agua embalsada en la Comunidad de Madrid (dataset en `data/df_embalses_medio_limpio.csv`) y calcula un indicador heurístico de riesgo de sequía para 2022.

## Estructura del proyecto
- `index.html`: estructura y componentes del dashboard.
- `styles.css`: estilos en tonos azules, tarjetas y paneles responsivos.
- `script.js`: carga y limpieza del CSV, cálculo de indicadores y creación de gráficas con Chart.js.
- `data/df_embalses_medio_limpio.csv`: dataset de volúmenes mensuales por embalse.

## Por qué usar un entorno virtual
- Aísla dependencias para que no contaminen otros proyectos ni el Python del sistema.
- Facilita la reproducibilidad: todo el mundo instala exactamente las mismas versiones (ver `requirements.txt`).
- Evita conflictos de paquetes globales que puedan romper el servidor local o los análisis con pandas.

### Cómo crear y activar el entorno virtual
1. Crea y activa un entorno virtual de Python (ejemplo con `venv`):
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # En Windows: .venv\\Scripts\\activate
   ```
2. Instala las dependencias mínimas para analizar los datos o servir los ficheros:
   ```bash
   pip install -r requirements.txt
   ```

## Servir el dashboard en `http://localhost:8000`
El CSV se lee vía `fetch`, y los navegadores bloquean la lectura de ficheros locales por CORS. Por eso necesitamos un servidor HTTP sencillo. Usamos el puerto 8000 porque es el estándar para desarrollo y evita conflictos con servicios del sistema.

### Opción recomendada (script dedicado)
Desde la raíz del repo, con el entorno virtual activo:
```bash
python serve.py  # usa host 0.0.0.0 y puerto 8000 por defecto
# saldrá un mensaje: "Sirviendo ... en http://0.0.0.0:8000"
```
Luego abre [http://localhost:8000/](http://localhost:8000/) en el navegador. Si no funciona:
- Asegúrate de que el comando sigue en ejecución (la terminal debe mostrar el mensaje anterior).
- Comprueba que no haya otro proceso usando el puerto 8000 o cámbialo con `--port 8010`.
- Verifica que estás en la raíz del proyecto para que `data/` e `index.html` se sirvan correctamente.

### Opción rápida con la librería estándar
```bash
python -m http.server 8000 --bind 0.0.0.0
```
El parámetro `--bind 0.0.0.0` expone el servidor a localhost y soluciona el error de "conexión rechazada" si el servidor no estaba escuchando.

Mantén la carpeta `data/` en la misma raíz que `index.html` para que la carga del CSV funcione correctamente.

## Lógica de sequía
- Se calcula la media histórica mensual (excluyendo 2022).
- Se calcula la media mensual de 2022 y su diferencia porcentual frente al histórico.
- Reglas heurísticas:
  - **Riesgo alto**: media 2022 ≤ 75% de la media histórica.
  - **Riesgo medio**: media 2022 entre 75% y 90% del histórico.
  - **Riesgo bajo**: media 2022 ≥ 90% del histórico.

## Visualizaciones
- Tarjetas con medias, diferencia porcentual y nivel heurístico de sequía.
- Un área compacta con controles para elegir entre:
  - Evolución temporal del volumen total mensual.
  - Comparación 2022 vs. media histórica.
  - Barras de promedios mensuales (histórico vs. 2022).

## Notas
- El dashboard usa Chart.js y Papa Parse desde CDNs, por lo que no requiere instalación adicional.
- Si la carga del CSV falla, se utilizan datos simulados mínimos para que la demo siga funcionando.
