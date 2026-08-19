# Bitácora de Vibe Coding

## 2026-08-17 — Evaluación y analisis del requerimiento 

### Solicitud
Se reviso el documento y se realizaron pruebas de conexion para comprobar el funcionamiento de los recursos antes de implementarlos por si requeria de intervención externa antes de comenzar.

### Resultado
Luego de analizar el requerimiento y explorar el alcance con diversas fuentes LLMs, se estructuro un plan detallado para generar la estructura completa para iniciar el proyecto teniendo ya unas bases claras, estructura definida y alcance medido segun respuestas en API interna de propiedades.

---

## 2026-08-18 — Implementación de plan inicial y pruebas de uso

### Agente utilizado
OpenCode

### Solicitud
- Elaborar las bases del proyecto con el Plan detallado paso a paso con branding inicial para "Inmuebles el exito".

### Resultado
El agente generó:
- Frontend (React) segun las especificaciones.
- Backend (Node.js con Express) segun las especificaciones.
- Tests con fixture de un ejemplo de la respuesta esperada en la API de propiedades.
- Script de seguridad para evitar la filtracion de datos sensibles.
- RAG estricto para las consultas al asistente.

### Verificaciones
- Revisé manualmente la estructura generada.
- Ejecuté los tests existentes.
- Ejecuté el script de seguridad solicitado.
- Realice pruebas de funcionamiento inicial.
- Revisé el responsive del proyecto.
- Realice pruebas dialogando con el asistente conversacional e verificando los resultados con los de las propiedades.
- Verifique el consumo a la API interna de propiedades asi como la funcionalidad agregada para sincronizar.

### Correcciones
- El RAG inicialmente era muy restrictivo, por lo que se hicieron diversas evaluacion para que fuera mas permisivo.
- Se agrego un contador de caracteres en el textarea del asistente, ya que contaba con limitaciones internas que seria de ayuda visual al usuario.
- Ajuste en filtros de relevancia a la hora de consultar.

### Resultado final
MVP funcional con acabado favorable para el usuario.

---

## 2026-08-19 — Pruebas adicionales y ajustes de experiencia

### Agente utilizado
OpenCode

### Solicitud
- Implementacion de paginador en panel de chat.
- Implementacion de marcas de tiempo en cada mensaje (actualmente solo se guardan sin embargo no se visualizaban frente al usuario).
- Ajuste de anchos para mantener la integridad visual entre pantallas.

### Resultado
El agente generó:
- Boton de paginacion para mostrar mensajes antiguos.
- Agrego las marcas de tiempo para que se puedieran visualizar en cada mensaje.
- Ajustar ancho para ocupar el espacio completo.

### Verificaciones
- Revisé el correcto funcionamiento del paginador.
- Verifiqué que las marcas de tiempo fueran las correctas.
- Ejecuté los tests para verificar su correcto funcionamiento.
- Verifiqué que los ajustes realizados se hayan aplicado de manera correcta en las diferentes versiones (web/mobile).

### Correcciones
Ajustar el limite de los mensajes a un umbral mas bajo 20 => 5.

### Resultado final
Una experiencia mas amigable en conversaciones extensas.

---