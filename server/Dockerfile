# ===== BUILD STAGE =====
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY Tenvora.Api.csproj ./
RUN dotnet restore Tenvora.Api.csproj

# Copy everything and publish
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# ===== RUNTIME STAGE =====
FROM mcr.microsoft.com/dotnet/aspnet:10.0

RUN apt-get update && apt-get install -y libkrb5-3 libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Tenvora.Api.dll"]
