FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/index.html
COPY api/user.json /usr/share/nginx/html/api/user.json

EXPOSE 80
