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
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy published artifacts from build stage
COPY --from=build --chown=appuser:appuser /app/publish .

# Switch to non-root user
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD dotnet --version || exit 1

ENTRYPOINT ["dotnet", "Tenvora.Api.dll"]
