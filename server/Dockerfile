# ===== BUILD STAGE =====
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only project file first for better layer caching
COPY Tenvora.Api.csproj ./

# Restore dependencies (cached if csproj unchanged)
RUN dotnet restore Tenvora.Api.csproj

# Copy source code
COPY . ./

# Build and publish
RUN dotnet publish -c Release -o /app/publish \
    --no-restore \
    --self-contained false

# ===== RUNTIME STAGE =====
FROM mcr.microsoft.com/dotnet/aspnet:10.0

# Install required system libraries
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    libkrb5-3 \
    libgssapi-krb5-2 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy published artifacts from build stage
COPY --from=build --chown=app:app /app/publish .

# Switch to non-root user (built into .NET images)
USER app

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dotnet", "Tenvora.Api.dll"]
