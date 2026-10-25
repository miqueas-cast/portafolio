# Miqueascast — Coming soon

Página estática adaptable, sin dependencias ni recursos externos. HTML, CSS y JavaScript; animaciones con soporte para `prefers-reduced-motion`. Funciona también sin JavaScript.

## Revisar localmente

Desde la raíz del repositorio:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abre el puerto 8000 en tu navegador local. Revisa escritorio y móvil. No requiere instalación ni compilación.

## Publicar en GitHub Pages (cuando apruebes los cambios)

1. Revisa y sube los archivos a la rama que usarás para publicar (por ejemplo, `main`).
2. En GitHub, abre Settings → Pages. Selecciona Deploy from a branch, la rama publicada y `/ (root)`.
3. `CNAME` prepara el dominio `miqueascast.me`; `.nojekyll` permite servir los archivos directamente.
4. La activación del dominio requiere configurar su DNS según la documentación vigente de GitHub Pages y verificar el dominio. Hazlo únicamente cuando autorices esa configuración; después activa HTTPS cuando esté disponible.

No se han cambiado ajustes de GitHub Pages ni DNS. El dominio y el despliegue no están activados por estos archivos. Para publicar primero con el dominio predeterminado de GitHub, excluye `CNAME` de esa publicación.
