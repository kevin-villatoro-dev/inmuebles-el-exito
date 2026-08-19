# Guía para Agentes Autónomos - Inmuebles el Éxito

> **Propósito**: Este documento establece las reglas, restricciones y flujos de trabajo que todo agente autónomo debe seguir al trabajar en este proyecto. Su objetivo principal es **prevenir errores** y mantener la integridad del sistema.

---

## 1. Stack y Versiones Relevantes

| Componente | Versión | Notas |
|------------|---------|-------|
| Node.js | ≥22.12.0 | **Requerido** para `node:sqlite` nativo |
| React | 19.2.8 | Sin `React.` prefix en JSX |
| Vite | 7.3.6 | Bundler para frontend |
| Express | 5.2.1 | Backend framework |
| SQLite | Nativo (`node:sqlite`) | NO usar better-sqlite3 |
| Jest | 30.4.2 | Testing framework |
| Tailwind CSS | 4.3.3 | Estilos via `@tailwindcss/vite` |
| Supertest | 7.2.2 | Testing de endpoints |

**⚠️ IMPORTANTE**: No instalar dependencias que requieran compilación nativa (C/C++) sin autorización explícita. El proyecto usa el módulo `node:sqlite` nativo para evitar problemas de binarios.

---

## 2. Arquitectura y Patrones que Deben Respetarse

### Backend (CommonJS)
```
backend/src/
├── app.js          # Express app factory (createApp)
├── config.js       # loadConfig() - Centraliza configuración
├── server.js       # Entry point
├── errors.js       # AppError personalizado
├── db/
│   └── repositories.js  # Acceso a datos (patrón repositorio)
├── middleware/
│   ├── auth.js     # Autenticación por cookies demo
│   └── rate-limit.js  # Rate limiting por usuario
└── services/
    ├── catalog.js  # Sincronización con API externa
    ├── assistant.js # Integración con OpenAI
    ├── chat.js     # Orquestación de chat
    └── security.js # Sanitización de datos
```

**Patrones obligatorios:**
- **Factory functions**: Todos los módulos exportan funciones `createXxx()`
- **Dependency Injection**: Servicios reciben dependencias via parámetros
- **AppError**: Todas las errores usan la clase `AppError` personalizada
- **Repositorios**: Acceso a DB solo vía `repositories.js`

### Frontend (ES Modules)
```
frontend/src/
├── App.jsx         # Componente raíz
├── api.js          # Cliente HTTP (api.xxx())
├── main.jsx        # Entry point
├── components/     # Componentes React funcionales
├── lib/
│   └── format.js   # Utilidades de formato
└── test/           # Setup y mocks de testing
```

**Patrones obligatorios:**
- **Componentes funcionales**: Usar hooks, NO clases
- **Estado local**: `useState` para estado simple, `useReducer` para lógica compleja
- **Efectos con cleanup**: Siempre abortar requests con `AbortController`
- **Manejo de errores**: Usar `ErrorBoundary` global + try/catch en async

---

## 3. Convenciones de Código

### JavaScript General
- **Funciones nombradas** para componentes y utilidades
- **Const > let > var**: Nunca usar `var`
- **Template literals** para interpolación de strings
- **Optional chaining** (`?.`) para acceso seguro a propiedades
- **Nullish coalescing** (`??`) para valores por defecto

### Backend (Node.js/Express)
```javascript
// ✅ Correcto
function createUserService({ db }) {
  return {
    findUser(id) {
      return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    }
  };
}

// ❌ Incorrecto - No usar arrow functions para exportar
const createUserService = ({ db }) => ({...});
```

### Frontend (React)
```jsx
// ✅ Correcto
export function UserCard({ user }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      {expanded && <p>{user.email}</p>}
    </div>
  );
}

// ❌ Incorrecto - No usar clases
class UserCard extends React.Component {...}
```

### Nombres de Archivos
- **Backend**: `kebab-case.js` (ej: `rate-limit.js`)
- **Frontend components**: `PascalCase.jsx` (ej: `ChatPanel.jsx`)
- **Tests**: `*.test.js` o `*.test.jsx` junto al archivo original
- **Estilos**: `styles.css` (único archivo CSS global)

---

## 4. Comandos para Ejecutar y Tests

### Desarrollo
```bash
# Backend (terminal 1)
cd backend
npm run dev          # Inicia en http://localhost:4000 con --watch

# Frontend (terminal 2)
cd frontend
npm run dev          # Inicia en http://localhost:5173 con proxy a backend
```

### Testing
```bash
# Backend - SIEMPRE ejecutar antes de commit
cd backend
npm test             # Jest con --runInBand

# Frontend - SIEMPRE ejecutar antes de commit
cd frontend
npm test             # Jest con jsdom environment
npm run build        # Verificar que el build no tiene errores
```

### Verificación de Seguridad
```bash
# Desde la raíz del proyecto
node scripts/check-secrets.js  # Detecta secretos en código fuente
```

### Comandos que NUNCA debes ejecutar
```bash
npm install --save-dev <algo>  # Sin autorización
rm -rf node_modules           # Puede corromper el entorno
git push --force              # Nunca force push
```

---

## 5. Reglas de Git

### Commits
- **Mensajes descriptivos** en inglés o español
- **Formato**: `(tipo): Descripción corta`
  - tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`
- **UN commit por cambio lógico** (no mezclar features)

### Archivos que NUNCA se commitean
```gitignore
.env                    # Secretos
*.db, *.sqlite          # Bases de datos
node_modules/           # Dependencias
dist/                   # Builds
coverage/               # Cobertura de tests
*.log                   # Logs
```

### Archivos que SÍ se versionan
- `package-lock.json` (instalaciones reproducibles)
- `backend/test/fixtures/*.json` (solo los anonimizados)

### Pre-commit Checklist
1. `npm test` pasa en backend y frontend
2. `npm run build` no tiene errores
3. `node scripts/check-secrets.js` no detecta secretos
4. `git diff` revisado manualmente

---

## 6. Restricciones de Seguridad

### NUNCA hagas esto
- ❌ Exponer claves API al frontend (sin prefijo `VITE_`)
- ❌ Desactivar CORS en producción
- ❌ Confiar en datos del usuario para queries SQL (siempre parametrizado)
- ❌ Committear `.env` o secretos
- ❌ Usar `eval()` o `new Function()` con input del usuario
- ❌ Desactivar validaciones de seguridad
- ❌ Almacenar PII sin sanitizar

### SIEMPRE haz esto
- ✅ Sanitizar input antes de enviar al backend
- ✅ Usar `AppError` para errores controlados
- ✅ Validar tipos en boundaries (backend: parámetros de ruta/query)
- ✅ Ejecutar `check-secrets.js` antes de commit
- ✅ Usar `httpOnly: true` en cookies
- ✅ Loggear errores 500+, nunca 4xx

### Variables de Entorno
```bash
# ✅ Correcto - Solo backend
CATALOG_API_URL=https://...
CATALOG_API_KEY=replace_with_your_key
OPENAI_API_KEY=replace_with_your_key

# ❌ Incorrecto - Nunca en frontend
VITE_OPENAI_API_KEY=replace_with_your_key  # ¡Expuesto al navegador!
```

---

## 7. Qué Puede y No Puede Hacer el Agente Autónomo

### ✅ PUEDE hacer
- Modificar código existente siguiendo patrones establecidos
- Agregar tests para nuevas funcionalidades
- Ejecutar tests y verificar build
- Actualizar documentación (README, AGENTS)
- Refactorizar código manteniendo la funcionalidad
- Corregir bugs identificados
- Agregar validaciones de seguridad

### ❌ NO PUEDE hacer
- Modificar `.env` o agregar secretos al repositorio
- Cambiar la configuración de CORS
- Modificar el esquema de SQLite sin actualizar repositorios
- Desactivar validaciones de seguridad
- Instalar dependencias nuevas sin autorización
- Cambiar versiones de Node.js o dependencias principales
- Eliminar archivos de test
- Modificar `check-secrets.js` para evadir detección

### ⚠️ REQUIERE AUTORIZACIÓN
- Agregar nuevas dependencias (npm install)
- Cambiar el esquema de la base de datos
- Modificar la configuración de rate limiting
- Cambiar la integración con OpenAI
- Modificar el contrato de la API externa
- Cambiar la estructura de archivos

---

## 8. Flujo de Validación antes de Considerar una Tarea Terminada

### Checklist de Validación
```bash
# 1. Tests unitarios pasan
cd backend && npm test
cd frontend && npm test

# 2. Build exitoso
cd frontend && npm run build

# 3. Sin secretos expuestos
node scripts/check-secrets.js

# 4. Sin errores de lint/formato (si aplica)
# Nota: El proyecto no tiene linter configurado actualmente

# 5. Revisión manual
git diff  # Revisar cada cambio
```

### Criterios de Aceptación
- [ ] Todos los tests existentes siguen pasando
- [ ] No hay regresiones en funcionalidad existente
- [ ] Código sigue patrones establecidos en el proyecto
- [ ] No hay secretos o PII en el diff
- [ ] Build de frontend no tiene errores
- [ ] Cambios son coherentes y lógicos

### Si los Tests Fallan
1. **NO** hacer commit
2. Revisar el error específico
3. Corregir el código (no desactivar el test)
4. Re-ejecutar hasta que pasen
5. Si es un test nuevo, verificar que la implementación es correcta

---

## 9. Comandos Rápidos de Referencia

```bash
# Verificar estado del proyecto
git status
git log --oneline -5

# Ejecutar todo
cd backend && npm test && cd ../frontend && npm test && npm run build

# Verificar secretos
node scripts/check-secrets.js

# Ver variables de entorno requeridas
cat backend/.env.example
```