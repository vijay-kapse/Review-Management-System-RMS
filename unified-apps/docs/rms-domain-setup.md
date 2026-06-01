# RMS Domain Setup

The RMS app is now designed to run under one origin, such as:

- `https://rms.cs.binghamton.edu`
- `https://rms.your-domain.edu`
- `https://rms-yourname.com`

All public app links should stay under the RMS portal:

- `/` for home
- `/apps` for the workspace
- `/launch/sysreview` for TRACE
- `/launch/argus` for ARGUS
- `/launch/chatbot` for QUEST
- `/launch/survey` for SPARK

## Server Wiring

The live RMS portal process listens on port `3005`. Public users should not need to type `:3005`; nginx should proxy normal web traffic to the portal:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name rms.cs.binghamton.edu www.rms.cs.binghamton.edu;

    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

After the DNS name works over HTTP, enable HTTPS with a certificate tool such as Certbot and then set:

```bash
PUBLIC_BASE_URL=https://rms.cs.binghamton.edu
COOKIE_SECURE=true
RMS_ALLOWED_HOSTS=rms.cs.binghamton.edu,www.rms.cs.binghamton.edu
RMS_CSRF_TRUSTED_ORIGINS=https://rms.cs.binghamton.edu,https://www.rms.cs.binghamton.edu
RMS_CORS_ALLOWED_ORIGINS=https://rms.cs.binghamton.edu,https://www.rms.cs.binghamton.edu
```

## DNS

For a Binghamton-controlled name, ask the CS/Binghamton DNS administrator to create:

```text
rms.cs.binghamton.edu.  A  128.226.116.24
```

For a domain you own, create either:

```text
rms.example.com.  A      128.226.116.24
www.example.com.  CNAME  rms.example.com.
```

or:

```text
www.example.com.  A  128.226.116.24
```

DNS only points the name at the server. nginx still has to accept that name and proxy it to port `3005`.

