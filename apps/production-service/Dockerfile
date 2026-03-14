FROM golang:1.24.1-alpine AS build
WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/production-service ./cmd/production-service

FROM alpine:3.21
RUN apk add --no-cache ca-certificates wget

WORKDIR /app
COPY --from=build /bin/production-service /usr/local/bin/production-service

EXPOSE 8084
ENTRYPOINT ["production-service"]