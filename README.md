# Dashboard de riesgo de sequía 2022

Dashboard web en HTML, CSS y JavaScript que analiza la serie temporal de agua embalsada en la Comunidad de Madrid (dataset en `data/df_embalses_medio_limpio.csv`) y calcula un indicador heurístico de riesgo de sequía para 2022.

## Estructura del proyecto
- `index.html`: estructura y componentes del dashboard.
- `styles.css`: estilos en tonos azules, tarjetas y paneles responsivos.
- `script.js`: carga y limpieza del CSV, cálculo de indicadores y creación de gráficas con Chart.js.
- `data/df_embalses_medio_limpio.csv`: dataset de volúmenes mensuales por embalse.

## Cómo ejecutar en un entorno virtual
1. Clona el repositorio y abre la carpeta en tu editor (por ejemplo VS Code).
2. Activa tu entorno virtual preferido (no es necesario instalar dependencias de Node; basta con un servidor estático). Opciones:
   - VS Code: usa la extensión **Live Server** y abre `index.html`.
   - Python (>=3.8): `python -m http.server 8000` y visita `http://localhost:8000/`.
3. Asegúrate de que la carpeta `data/` permanece en la misma raíz que `index.html` para que la carga del CSV funcione correctamente.

## Lógica de sequía
- Se calcula la media histórica mensual (excluyendo 2022).
- Se calcula la media mensual de 2022 y su diferencia porcentual frente al histórico.
- Reglas heurísticas:
  - **Riesgo alto**: media 2022 ≤ 75% de la media histórica.
  - **Riesgo medio**: media 2022 entre 75% y 90% del histórico.
  - **Riesgo bajo**: media 2022 ≥ 90% del histórico.

## Visualizaciones
- Evolución temporal del volumen total mensual.
- Comparación de 2022 frente a la media histórica por mes.
- Tarjetas con indicadores de medias y porcentaje de diferencia.

## Notas
- El dashboard usa Chart.js y Papa Parse desde CDNs, por lo que no requiere instalación adicional.
- Si la carga del CSV falla, se utilizan datos simulados mínimos para que la demo siga funcionando.
