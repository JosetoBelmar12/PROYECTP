#!/bin/bash
# Script de despliegue para Hostinger VPS con Ubuntu 24.04
# Ejecutar como: bash deploy.sh

set -e

echo "=========================================="
echo "Despliegue de Áridos App en VPS Hostinger"
echo "=========================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# PASO 1: Actualizar sistema
# ============================================
log_info "Paso 1: Actualizando sistema..."
apt update
apt upgrade -y
apt install -y curl wget git build-essential libssl-dev libffi-dev python3-dev python3-pip python3-venv

# ============================================
# PASO 2: Instalar Python 3.12
# ============================================
log_info "Paso 2: Verificando Python 3.12 (incluido en Ubuntu 24.04)..."
apt install -y python3.12 python3.12-venv python3.12-dev
update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1
update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1

# ============================================
# PASO 3: Instalar y configurar PostgreSQL
# ============================================
log_info "Paso 3: Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Iniciar PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Crear base de datos y usuario
log_info "Creando base de datos PostgreSQL..."
sudo -u postgres psql << EOF
CREATE DATABASE aridosdb;
CREATE USER aridosuser WITH PASSWORD 'aridosPassword123!@#';
ALTER ROLE aridosuser SET client_encoding TO 'utf8';
ALTER ROLE aridosuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE aridosuser SET default_transaction_deferrable TO on;
ALTER ROLE aridosuser SET default_transaction_level TO 'read committed';
ALTER ROLE aridosuser SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE aridosdb TO aridosuser;
\c aridosdb
GRANT ALL PRIVILEGES ON SCHEMA public TO aridosuser;
EOF

log_info "✓ Base de datos creada"
log_warn "DATABASE_URL: postgresql://aridosuser:aridosPassword123!@#@localhost:5432/aridosdb"

# ============================================
# PASO 4: Crear directorio de la app
# ============================================
log_info "Paso 4: Preparando directorio de la aplicación..."
APP_DIR="/home/aridosapp"
mkdir -p $APP_DIR
cd $APP_DIR

# ============================================
# PASO 5: Clonar repositorio de GitHub
# ============================================
log_info "Paso 5: Clonando repositorio de GitHub..."
git clone https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/PROYECTP.git .

log_error "Si el clone falló, ejecuta manualmente:"
log_error "cd $APP_DIR"
log_error "git clone https://github.com/TU_USUARIO/PROYECTP.git ."

# ============================================
# PASO 6: Crear ambiente virtual
# ============================================
log_info "Paso 6: Creando ambiente virtual..."
python3.12 -m venv venv
source venv/bin/activate

# ============================================
# PASO 7: Instalar dependencias Python
# ============================================
log_info "Paso 7: Instalando dependencias Python..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
pip install gunicorn

# ============================================
# PASO 8: Crear archivo .env
# ============================================
log_info "Paso 8: Creando archivo .env..."
cat > $APP_DIR/.env << EOF
DATABASE_URL=postgresql://aridosuser:aridosPassword123!@#@localhost:5432/aridosdb
PYTHONUNBUFFERED=1
EOF

log_warn "⚠️  IMPORTANTE: Cambia la contraseña en .env si lo necesitas"

# ============================================
# PASO 9: Modificar database.py para PostgreSQL
# ============================================
log_info "Paso 9: Confirmando configuración de base de datos..."
grep -q "postgresql" app/database.py && log_info "✓ database.py ya está configurado para PostgreSQL"

# ============================================
# PASO 10: Crear servicio Systemd para Gunicorn
# ============================================
log_info "Paso 10: Configurando servicio Gunicorn..."
cat > /etc/systemd/system/aridosapp.service << EOF
[Unit]
Description=Gunicorn instance to serve Áridos App
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
Environment="PYTHONPATH=$APP_DIR"
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/venv/bin/gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 main:app
Restart=always
RestartSec=10
StandardOutput=append:/var/log/aridosapp.log
StandardError=append:/var/log/aridosapp.log

[Install]
WantedBy=multi-user.target
EOF

# ============================================
# PASO 11: Instalar y configurar Nginx
# ============================================
log_info "Paso 11: Instalando y configurando Nginx..."
apt install -y nginx

# Crear configuración de Nginx
cat > /etc/nginx/sites-available/aridosapp << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /static {
        alias /home/aridosapp/static;
        expires 30d;
    }
}
EOF

# Habilitar configuración
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/aridosapp /etc/nginx/sites-enabled/aridosapp

# Verificar configuración
nginx -t

# ============================================
# PASO 12: Instalar Certbot para SSL
# ============================================
log_info "Paso 12: Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx

# ============================================
# PASO 13: Permisos y directorios
# ============================================
log_info "Paso 13: Configurando permisos..."
useradd -m -s /bin/bash www-data 2>/dev/null || true
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# Crear archivo de logs
touch /var/log/aridosapp.log
chown www-data:www-data /var/log/aridosapp.log

# ============================================
# PASO 14: Habilitar servicios
# ============================================
log_info "Paso 14: Habilitando servicios..."
systemctl daemon-reload
systemctl enable aridosapp
systemctl enable nginx

# Iniciar servicios
systemctl restart postgresql
systemctl restart aridosapp
systemctl restart nginx

# ============================================
# PASO 15: Información final
# ============================================
echo ""
echo "=========================================="
echo -e "${GREEN}✓ DESPLIEGUE COMPLETADO${NC}"
echo "=========================================="
echo ""
echo "Información importante:"
echo ""
echo "📱 Tu aplicación está en: http://69.62.98.171"
echo ""
echo "🔐 CONFIGURAR SSL (HTTPS) - Ejecuta:"
echo "   certbot --nginx -d tusitio.com"
echo "   (Reemplaza 'tusitio.com' con tu dominio)"
echo ""
echo "📊 Ver logs en tiempo real:"
echo "   tail -f /var/log/aridosapp.log"
echo ""
echo "🔧 Comandos útiles:"
echo "   systemctl restart aridosapp     # Reiniciar app"
echo "   systemctl status aridosapp      # Ver estado"
echo "   systemctl stop aridosapp        # Detener app"
echo ""
echo "🗄️  Base de datos PostgreSQL:"
echo "   Host: localhost"
echo "   Database: aridosdb"
echo "   User: aridosuser"
echo "   Password: aridosPassword123!@#"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Cambia la contraseña de PostgreSQL en $APP_DIR/.env"
echo "   2. Configura tu dominio si tienes uno"
echo "   3. Configura SSL con certbot cuando sea posible"
echo ""
