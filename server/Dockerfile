# ===== BUILD STAGE =====
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only project file first for better layer caching
COPY Tenvora.Api.csproj ./

# Keep restored packages in this image layer. A transient BuildKit cache mount can
# be incomplete even when the restore command layer itself is reused.
RUN dotnet restore Tenvora.Api.csproj

# Copy source code
COPY . ./

# Build and publish
RUN dotnet publish -c Release -o /app/publish \
    --no-restore \
    --self-contained false \
    -p:UseAppHost=false

# ===== RUNTIME STAGE =====
FROM mcr.microsoft.com/dotnet/aspnet:10.0

WORKDIR /app

# Copy published artifacts from build stage
COPY --from=build --chown=app:app /app/publish .

# Switch to non-root user (built into .NET images)
USER app

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/bin/bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/5000"]

ENTRYPOINT ["dotnet", "Tenvora.Api.dll"]
