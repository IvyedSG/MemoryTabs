# Linetabs

Una extensión de Chrome que permite rastrear y visualizar tu cronología de navegación con capturas de pantalla.

## Características

- 📅 **Cronología de navegación**: Visualiza tu historial de pestañas con timestamps
- 📷 **Capturas automáticas**: Toma screenshots de las páginas visitadas
- ⏱️ **Seguimiento de tiempo**: Registra cuánto tiempo pasas en cada sitio
- 🗂️ **Gestión de sesiones**: Mantiene el historial entre sesiones del navegador
- 🎨 **Interfaz moderna**: Diseño limpio con Tailwind CSS
- 📆 **Agrupación por días**: Organiza el timeline por días (Hoy, Ayer, etc.)
- 🔍 **Búsqueda en tiempo real**: Busca por título o dominio con resaltado de términos
- 🎯 **Navegación intuitiva**: Separadores visuales y contadores de páginas

## Estructura del Proyecto

```text
memorytabs/
├── manifest.json              # Configuración de la extensión
├── popup.html                # HTML del popup
├── vite.config.js            # Configuración de Vite
├── package.json              # Dependencias y scripts
├── public/
│   └── icons/                # Iconos de la extensión
└── src/
    ├── assets/               # Estilos CSS
    ├── background/           # Scripts de background
    │   ├── index.js
    │   └── background-service.js
    ├── components/           # Componentes Vue
    │   ├── TimelineEntry.vue
    │   └── TimelineView.vue
    ├── composables/          # Lógica reutilizable
    │   └── usePopup.js
    ├── content/              # Content scripts
    │   └── index.js
    ├── models/               # Modelos de datos
    │   ├── SessionManager.js
    │   └── TabManager.js
    ├── popup/                # Popup de la extensión
    │   ├── main.js
    │   └── PopupApp.vue
    └── utils/                # Utilidades
        ├── constants.js
        ├── helpers.js
        ├── screenshot.js
        └── storage.js
```

## Tecnologías

- **Vue 3**: Framework principal para la interfaz
- **Tailwind CSS**: Para estilos y diseño
- **Vite**: Bundler y herramientas de desarrollo
- **Chrome Extension API**: Para integración con el navegador

## Scripts

- `npm run build`: Construye el proyecto
- `npm run build:extension`: Construye y prepara la extensión
- `npm run lint`: Ejecuta ESLint
- `npm run format`: Formatea el código con Prettier

## Instalación

1. Clona el repositorio
2. Instala las dependencias: `npm install`
3. Construye la extensión: `npm run build:extension`
4. Carga la carpeta `dist/` en Chrome como extensión sin empaquetar

## Desarrollo

El proyecto está optimizado para desarrollo de extensiones de Chrome con Vue 3. Todos los archivos innecesarios han sido eliminados para mantener un código base limpio y enfocado.
