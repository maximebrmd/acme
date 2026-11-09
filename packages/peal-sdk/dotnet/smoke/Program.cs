// The smoke test, which scripts/test.ts runs against a stand-in API: the
// health check, the signed-in user with a bearer token, and the error a
// refused token raises.
using Peal;

string baseUrl = Environment.GetEnvironmentVariable("PEAL_API_URL")!;
var peal = new PealClient("peal_test", new ClientOptions { BaseUrl = baseUrl });

await peal.System.HealthAsync();
var me = await peal.Session.MeAsync();

if (me.User.Email != "ada@example.test" || me.ImpersonatedBy is not null || me.User.Image is not null
    || !me.Workspaces.First().Permissions.Contains(Permission.PostSchedule))
{
    throw new InvalidOperationException($"Unexpected answer: {me}");
}

try
{
    await new PealClient("refused", new ClientOptions { BaseUrl = baseUrl }).Session.MeAsync();
    throw new InvalidOperationException("A refused token got an answer");
}
catch (PealClientApiException error) when (error.StatusCode == 401)
{
    // The 401 the stand-in answers a refused token.
}

Console.WriteLine("ok");
