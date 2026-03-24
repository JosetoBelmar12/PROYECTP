@echo off
cd /d "c:\Users\JMBel\OneDrive\Escritorio\PROYECTP"
call .venv\Scripts\activate.bat
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
