using System.Security.Cryptography;
using System.Text;

namespace VeriSpend.Api.Services;

public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;

    public static string Hash(string password)
    {
        using var algorithm = new Rfc2898DeriveBytes(password, SaltSize, Iterations, HashAlgorithmName.SHA256);
        var key = algorithm.GetBytes(KeySize);
        var salt = algorithm.Salt;

        return Convert.ToBase64String(salt) + ":" + Convert.ToBase64String(key);
    }

    public static bool Verify(string hashedPassword, string suppliedPassword)
    {
        var parts = hashedPassword.Split(':', 2);
        if (parts.Length != 2)
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[0]);
        var storedKey = Convert.FromBase64String(parts[1]);

        using var algorithm = new Rfc2898DeriveBytes(suppliedPassword, salt, Iterations, HashAlgorithmName.SHA256);
        var computedKey = algorithm.GetBytes(KeySize);
        return CryptographicOperations.FixedTimeEquals(computedKey, storedKey);
    }
}
