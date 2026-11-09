// The smoke test, which scripts/test.ts runs against a stand-in API: the
// health check, then the signed-in user with a bearer token, set up as the
// README shows.
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Peal.Api;
using Peal.Client;
using Peal.Extensions;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

builder.ConfigureApi(options =>
{
    options.AddTokens(new BearerToken("peal_test"));
    options.AddApiHttpClients(client =>
        client.BaseAddress = new Uri(Environment.GetEnvironmentVariable("PEAL_API_URL")!));
});

using IHost host = builder.Build();

IHealthApiResponse health = await host.Services.GetRequiredService<ISystemApi>().HealthAsync();
if (!health.IsNoContent)
{
    throw new InvalidOperationException($"Health check answered {health.StatusCode}");
}

ISessionMeApiResponse response = await host.Services.GetRequiredService<ISessionApi>().SessionMeAsync();
Peal.Model.Me me = response.Ok() ?? throw new InvalidOperationException($"GET /api/me answered {response.StatusCode}");

if (me.User.Email != "ada@example.test" || me.ImpersonatedBy is not null || me.User.Image is not null
    || !me.Workspaces[0].Permissions.Any(permission => Peal.Model.PermissionValueConverter.ToJsonValue(permission) == "post:schedule"))
{
    throw new InvalidOperationException($"Unexpected answer: {me}");
}

Console.WriteLine("ok");
