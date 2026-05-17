FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json .
RUN rm -f package-lock.json && npm install --legacy-peer-deps

FROM base AS development
CMD ["npm", "run", "dev"]

FROM base AS build
# VITE_* vars are baked into the JS bundle at build time — pass them as ARGs
ARG VITE_API_URL
ARG VITE_NETWORK_ID=preprod
ARG VITE_INDEXER_URL=https://indexer.preprod.midnight.network/api/v4/graphql
ARG VITE_INDEXER_WS=wss://indexer.preprod.midnight.network/api/v4/graphql/ws
ARG VITE_NODE_RPC=https://rpc.preprod.midnight.network
ARG VITE_PROOF_SERVER_URL
ARG VITE_CONTRACT_ADDRESS
ARG VITE_DEMO_MODE
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
