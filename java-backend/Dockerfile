FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN mkdir -p target/classes
RUN javac -d target/classes $(find src/main/java -name "*.java")

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/classes /app/target/classes
ENV PORT=8080
EXPOSE 8080
CMD ["java", "-cp", "target/classes", "com.corepay.server.TransactionServer"]
