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
3. Levanta un servidor estático para evitar bloqueos de CORS al leer el CSV:
   ```bash
   python -m http.server 8000
   # luego visita http://localhost:8000/
   ```
4. Mantén la carpeta `data/` en la misma raíz que `index.html` para que la carga del CSV funcione correctamente.

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
