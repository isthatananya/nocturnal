FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json .
RUN rm -f package-lock.json && npm install --legacy-peer-deps

FROM base AS development
CMD ["npm", "run", "dev"]

FROM base AS build
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
