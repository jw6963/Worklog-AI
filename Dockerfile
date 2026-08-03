FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /backend
COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend-build /frontend/dist /frontend/dist
RUN mvn -B package -DskipTests -DincludeFrontend

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S worklog && adduser -S worklog -G worklog
WORKDIR /app
COPY --from=backend-build /backend/target/backend-*.jar app.jar
USER worklog
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
