@echo off
cd /d "%~dp0"
echo.
echo  Eldritch Horror - Mazos
echo  El celular tiene que estar en la misma red WiFi que esta PC.
echo  Abri en el navegador del celular alguna de estas direcciones:
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo     http://%%a:8000
echo.
echo  (Deja esta ventana abierta mientras jugas. Cerrala para apagar.)
echo.
python -m http.server 8000 --bind 0.0.0.0
pause
