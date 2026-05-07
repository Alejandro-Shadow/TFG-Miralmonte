# FacturApp - Conexión Supabase

## ✅ Integración Completada

La aplicación FacturApp está completamente integrada con Supabase. Se ha implementado:

### Características Implementadas

1. **Autenticación**
   - Login/Registro de usuarios
   - Gestión de tokens JWT
   - Sistema de sesión

2. **CRUD de Facturas**
   - Crear nuevas facturas
   - Editar facturas (solo borradores)
   - Ver detalles de facturas
   - Eliminar facturas (solo borradores)
   - Emitir a Verifactu

3. **Gestión de Datos**
   - Conexión REST API a Supabase
   - Sincronización de datos en tiempo real
   - Cálculo de estadísticas

## 🚀 Cómo Usar

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`

### 3. Datos de Prueba (Demo)

**Email:** `demo@facturapp.es`
**Contraseña:** `demo123`

**O crear una nueva cuenta registrándose directamente en la app.**

## 📱 Flujo de Usuario

### Primera Vez
1. Ir a http://localhost:5173
2. Crear cuenta nueva o usar credenciales demo
3. Se abre automáticamente el Dashboard

### Dashboard
- Ver estadísticas de facturas
- Acciones rápidas (crear, escanear QR, exportar)
- Últimas facturas registradas

### Gestión de Facturas
- **Nueva Factura:** Botón "➕ Nueva Factura"
- **Ver Factura:** Click en la fila de la factura
- **Editar:** Botón "✏️" (solo si está en borrador)
- **PDF:** Botón "📥" (descarga PDF)
- **Eliminar:** Botón "🗑️" (solo si está en borrador)

### Estados de Factura
- **Borrador:** Editable, no emitida
- **Emitida:** Emitida a Verifactu, no editable
- **Anulada:** Cancelada

## 🗄️ Estructura de la BD Supabase

### Tablas Principales

**cliente**
- id (PK)
- email (UNIQUE)
- password
- actualizacion_pagada

**emisores**
- id (PK)
- nombre
- cif_nif
- direccion_fiscal
- correo_contacto
- estado_verifactu
- etc.

**facturas**
- id (PK)
- id_emisor (FK)
- id_cliente (FK)
- numero_factura
- fecha_emision
- total_factura
- estado_pago
- estado_verifactu
- etc.

**clientesEmisor**
- id (PK)
- nombre
- cif_nif_nie
- direccion_completa
- contacto
- etc.

**serieFacturacion**
- id (PK)
- serie
- idEmisor
- numeroActual

## 🔧 Servicios Principales

### auth-service.js
- `login(email, password)` - Autenticar usuario
- `register(email, password)` - Crear nuevo usuario
- `logout()` - Cerrar sesión
- `getClienteId()` - Obtener ID del cliente actual

### invoice-service.js
- `setContext(clienteId, emisorId)` - Establecer contexto
- `getAll()` - Obtener todas las facturas
- `getById(id)` - Obtener factura por ID
- `create(data)` - Crear nueva factura
- `update(id, data)` - Actualizar factura
- `delete(id)` - Eliminar factura
- `getStats()` - Obtener estadísticas
- `search(query)` - Buscar facturas
- `filterByStatus(status)` - Filtrar por estado

## 🌍 URLs de Supabase

**Base URL:** https://xvpudwpebfvjhxqahdxo.supabase.co
**REST API:** https://xvpudwpebfvjhxqahdxo.supabase.co/rest/v1

## 📝 Variables de Ambiente

Las credenciales están hardcoded en `src/utils/supabase.js`:
- SUPABASE_URL
- SUPABASE_ANON_KEY

Para producción, mover a `.env`:
```
VITE_SUPABASE_URL=https://xvpudwpebfvjhxqahdxo.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_aqui
```

## 🔒 Seguridad

- Las facturas emitidas no pueden ser editadas
- Solo se pueden ver/editar facturas del emisor del usuario
- Los tokens JWT se almacenan en localStorage
- Las contraseñas se envían en texto plano (implementar bcrypt en producción)

## 🐛 Debugging

Ver logs en la consola del navegador (F12) para ver:
- Llamadas a Supabase
- Errores de autenticación
- Cambios de estado

## 📦 Scripts npm

```bash
npm run dev      # Iniciar servidor desarrollo
npm run build    # Build para producción
npm run preview  # Vista previa del build
```

## 🚨 Notas Importantes

1. Los datos se persisten en Supabase, no en localStorage
2. Requiere conexión a internet
3. Los datos son compartidos entre sesiones
4. Se recomienda implementar Row Level Security (RLS) en producción

## ✨ Próximos Pasos (Opcional)

- [ ] Implementar Row Level Security (RLS) en Supabase
- [ ] Agregar validación de formularios más robusta
- [ ] Implementar PDF con datos reales
- [ ] Agregar múltiples emisores por usuario
- [ ] Implementar paginación
- [ ] Agregar notificaciones en tiempo real
- [ ] Mejorar manejo de errores

---
**Creado:** 2026-05-07
**Versión:** 1.0.0
