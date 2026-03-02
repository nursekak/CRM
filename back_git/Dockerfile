FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["sh", "-c", \"node src/db/migrate.js; node src/db/migrateShipments.js; node src/db/migrateShipmentsAddTitle.js; node src/db/migrateWarehouseImage.js; node src/db/migrateShipmentFromWarehouse.js; node src/db/seed.js; node src/index.js\"]
