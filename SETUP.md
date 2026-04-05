# 🌱 Maby Mentorías — Guía de Configuración Completa

## Índice
1. [Estructura del proyecto](#estructura)
2. [Configurar Supabase](#supabase)
3. [Configurar la app](#app)
4. [Subir a GitHub](#github)
5. [Deploy en Cloudflare Pages](#cloudflare)
6. [Uso diario](#uso)

---

## 1. Estructura del proyecto {#estructura}

```
mentorias-app/
├── index.html       → App completa (HTML + estructura)
├── styles.css       → Diseño responsive mobile-first
├── app.js           → Lógica + conexión a Supabase
├── database.sql     → Script para crear la base de datos
└── SETUP.md         → Esta guía
```

---

## 2. Configurar Supabase {#supabase}

### Paso 1: Crear cuenta y proyecto

1. Ir a **https://supabase.com** y crear una cuenta gratuita
2. Hacer clic en **"New project"**
3. Elegir un nombre (ej: `maby-mentorias`)
4. Crear una contraseña segura para la BD (guardala en algún lado)
5. Seleccionar región: **South America (São Paulo)** — la más cercana a Argentina
6. Hacer clic en **"Create new project"** y esperar ~2 minutos

### Paso 2: Crear la base de datos

1. En el panel de Supabase, ir a **SQL Editor** (ícono de terminal en el menú izquierdo)
2. Hacer clic en **"New query"**
3. Copiar y pegar todo el contenido de `database.sql`
4. Hacer clic en **"Run"** (botón verde o Ctrl+Enter)
5. Deberías ver: `Success. No rows returned`

Esto crea:
- La tabla `mentorias` con todos los campos
- Índices para mejor performance
- Políticas de seguridad (RLS)
- 10 registros de ejemplo

### Paso 3: Obtener las credenciales

1. Ir a **Project Settings** (engranaje ⚙️ en el menú izquierdo)
2. Hacer clic en **"API"**
3. Copiar estos dos valores:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon / public key** → una clave larga que empieza con `eyJ...`

### Paso 4: Crear el usuario (tu login)

1. Ir a **Authentication** en el menú izquierdo
2. Hacer clic en **"Add user"** → **"Create new user"**
3. Ingresar tu email y contraseña
4. Hacer clic en **"Create user"**

> ⚠️ **IMPORTANTE**: Esta es la contraseña que usarás para entrar a la app.

---

## 3. Configurar la app {#app}

Abrí el archivo `app.js` y buscá estas dos líneas al inicio:

```javascript
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
```

Reemplazá:
- `TU_PROYECTO.supabase.co` → con tu **Project URL**
- `TU_ANON_KEY` → con tu **anon public key**

**Ejemplo real:**
```javascript
const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Probar localmente

Podés abrir `index.html` directamente en el navegador, o usar una extensión como **Live Server** en VS Code para mejor experiencia.

---

## 4. Subir a GitHub {#github}

### Paso 1: Crear repositorio

1. Ir a **https://github.com** e iniciar sesión (o crear cuenta)
2. Hacer clic en el botón **"+"** → **"New repository"**
3. Nombre: `maby-mentorias` (o el que prefieras)
4. Visibilidad: **Private** (recomendado, para que las claves no sean públicas)
5. Hacer clic en **"Create repository"**

### Paso 2: Subir los archivos

**Opción A — Sin usar la terminal (más fácil):**
1. En la página del repositorio vacío, hacer clic en **"uploading an existing file"**
2. Arrastrar los 4 archivos: `index.html`, `styles.css`, `app.js`, `database.sql`
3. Hacer clic en **"Commit changes"**

**Opción B — Con Git (si tenés instalado):**
```bash
# En la carpeta mentorias-app
git init
git add .
git commit -m "Versión inicial — Maby Mentorías"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/maby-mentorias.git
git push -u origin main
```

---

## 5. Deploy en Cloudflare Pages {#cloudflare}

### Paso 1: Crear cuenta

1. Ir a **https://pages.cloudflare.com** y crear una cuenta gratuita

### Paso 2: Conectar GitHub

1. Hacer clic en **"Create a project"**
2. Elegir **"Connect to Git"**
3. Autorizar a Cloudflare para acceder a tu GitHub
4. Seleccionar el repositorio `maby-mentorias`

### Paso 3: Configurar el build

En la pantalla de configuración:
- **Framework preset**: `None`
- **Build command**: *(dejar vacío)*
- **Build output directory**: `/` *(o dejar vacío)*
- **Root directory**: *(dejar vacío)*

Hacer clic en **"Save and Deploy"**.

### Paso 4: Tu URL

Cloudflare te dará una URL como:
```
https://maby-mentorias.pages.dev
```

¡Ya está online! Cada vez que subas cambios a GitHub, Cloudflare los desplegará automáticamente en ~30 segundos.

### Paso 5 (opcional): Dominio personalizado

Si tenés un dominio propio, podés configurarlo en:
Cloudflare Pages → Tu proyecto → Custom domains → Add custom domain

---

## 6. Uso diario {#uso}

### Login
- Acceder a tu URL de Cloudflare
- Ingresar el email y contraseña que creaste en Supabase Authentication

### Crear una mentoría
1. Tocar el botón **"+ Nuevo"**
2. Completar los datos (nombre y apellido son obligatorios)
3. Tocar **"Guardar"**

### Ver detalle / Editar / Eliminar
- Tocar cualquier tarjeta para ver el detalle completo
- Desde el detalle podés **Editar** o **Eliminar**

### Filtrar por estado
- Los chips arriba (Todos / Sin resp. / En contacto / Seguimiento / Activa)
- La búsqueda por nombre o email

### Exportar
- Botón **"Excel"** → descarga un archivo `.xlsx` con todos los datos
- Botón **"PDF"** → descarga un PDF con tabla completa

---

## Troubleshooting

**"Error al cargar datos"**
→ Verificá que las claves de Supabase en `app.js` sean correctas.

**No puedo hacer login**
→ Verificá en Supabase → Authentication → Users que el usuario exista y esté confirmado.

**Los datos no se guardan**
→ Verificá que las políticas RLS estén activas (el script SQL las crea automáticamente).

**La app no carga en Cloudflare**
→ Verificá que el archivo `index.html` esté en la raíz del repositorio.

---

## Mensaje de bienvenida sugerido

> ¡Hola! 👋 Mi nombre es Maby Mereles, soy Counselor egresada de Holos Capital Counseling.
> Me pongo en contacto porque en esta etapa voy a acompañarte como tu mentora. 🌱
> La mentoría es un espacio pensado para vos...

Podés copiar este mensaje desde la app guardándolo en las Observaciones del primer contacto.

---

*Desarrollado para Maby Mereles — Counselor · Holos Capital Counseling*
