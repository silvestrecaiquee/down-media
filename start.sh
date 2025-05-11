#!/bin/bash

# Iniciar o OpenVPN em background
openvpn --config /etc/openvpn/client.ovpn &

# Aguardar a conexão VPN estabelecer
sleep 10

# Iniciar a aplicação Node.js
npm start 