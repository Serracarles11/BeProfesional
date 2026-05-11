# BeProfesional

**BeProfesional** es una aplicación web orientada a la gestión deportiva.  
Permite trabajar con equipos, jugadores, entrenamientos, partidos, estadísticas y herramientas auxiliares como Play Maker con IA.

Este README incluye la guía completa de implementación para poder probar la aplicación en local o desplegarla públicamente.

---

## Tabla de contenidos

- [1. Descripción del proyecto](#1-descripción-del-proyecto)
- [2. Tecnologías utilizadas](#2-tecnologías-utilizadas)
- [3. Requisitos previos](#3-requisitos-previos)
- [4. Instalación de dependencias y uso de componentes](#4-instalación-de-dependencias-y-uso-de-componentes)
- [5. Implementación del entorno de desarrollo](#5-implementación-del-entorno-de-desarrollo)
- [6. Variables de entorno](#6-variables-de-entorno)
- [7. Ejecución local](#7-ejecución-local)
- [8. Despliegue de la aplicación con Docker Compose](#8-despliegue-de-la-aplicación-con-docker-compose)
- [9. Despliegue de la base de datos](#9-despliegue-de-la-base-de-datos)
- [10. Scripts disponibles](#10-scripts-disponibles)
- [11. Estructura del proyecto](#11-estructura-del-proyecto)
- [12. Demo online](#12-demo-online)
- [13. Autor](#13-autor)

---

## 1. Descripción del proyecto

BeProfesional es una plataforma web pensada para entornos deportivos.  
Su objetivo es facilitar la gestión de equipos y jugadores, además del seguimiento de entrenamientos, partidos y estadísticas.

Entre sus funcionalidades principales se incluyen:

- creación y gestión de equipos
- gestión de jugadores
- organización de entrenamientos
- gestión de partidos
- visualización de estadísticas
- herramientas de apoyo con IA
- integración con Supabase
- utilidades de scraping e importación de datos

---

## 2. Tecnologías utilizadas

Este proyecto está construido principalmente con:

- **Next.js 16**
- **React 19**
- **Tailwind CSS 4**
- **Supabase**
- **OpenAI API**
- **ExerciseDB API**
- **Remove.bg API**
- **Docker**
- **Docker Compose**
- **Node.js**
- **Playwright** en la parte de scrapers

---

## 3. Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- **Node.js 22**
- **npm 10**
- **Git**
- **Docker**
- **Docker Compose**

Puedes comprobarlo con:

```bash
node -v
npm -v
git --version
docker -v
docker compose version

## 4.Instalación de dependencias y uso de componentes
git clone https://github.com/Serracarles11/BeProfesional.git
cd BeProfesional

Instalar dependencias
npm install

Iniciar el entorno de desarrollo
npm run dev










