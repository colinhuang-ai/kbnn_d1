FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/index.html
COPY app.js /usr/share/nginx/html/app.js
COPY api/user.json /usr/share/nginx/html/api/user.json

EXPOSE 80
