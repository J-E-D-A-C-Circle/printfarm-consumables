1. Start the Docker stack (including Nginx & secured phpMyAdmin)
docker compose up -d --build

This starts Nginx listening on port 80 (0.0.0.0:80 in docker-compose.yml), which accepts connections from any device on your local network and forwards them to the Next.js app (app:3000).
-----------------------------------------------------------------------------------------------------------------------------------------------------
2. Find your AIO Desktop's Local IP Address
ipconfig

Look under your active network adapter (Wireless LAN adapter Wi-Fi or Ethernet adapter) for IPv4 Address, for example:
192.168.1.45 (or 10.x.x.x / 192.168.0.x)
-----------------------------------------------------------------------------------------------------------------------------------------------------
3. Allow Port 80 Through Windows Firewall on the AIO Desktop

Run PowerShell as Administrator on your AIO Desktop and execute:
New-NetFirewallRule -DisplayName "DVLA Consumables Nginx (HTTP)" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
-----------------------------------------------------------------------------------------------------------------------------------------------------
4. How Other Users Connect on the Same Network

Any user on the same network can open their browser and go directly to your AIO Desktop's IP address (no :3000 port needed):
http://192.168.1.45
-----------------------------------------------------------------------------------------------------------------------------------------------------
5. App Login Credentials (Password for all roles: Admin@1234)
- Administrator:            admin@dvla.gov.gh
- Store Officer (Issuer):   issuer@dvla.gov.gh
- Station Officer (Request):requester@dvla.gov.gh
- Supervisor:               supervisor@dvla.gov.gh
- Viewer (Read-only):       viewer@dvla.gov.gh
-----------------------------------------------------------------------------------------------------------------------------------------------------
6. phpMyAdmin Database Login (http://localhost:8080)
phpMyAdmin now requires login credentials (auto-login is disabled):
- App Database User:  dvla_user  /  Password: dvla_pass
- Root Admin User:    root       /  Password: dvla_root_2026
