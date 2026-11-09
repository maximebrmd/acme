# Peal for .NET

The client for the [Peal](https://peal.social) API: schedule posts across
social platforms, follow how they did, and manage a workspace's channels,
media and members.

```sh
dotnet add package Peal
```

It targets .NET 10 and plugs into the .NET generic host. Register the API with
a token, a workspace API key (`peal_…`) or an OAuth access token, then ask the
host for the API you need:

```cs
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Peal.Api;
using Peal.Client;
using Peal.Extensions;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

builder.ConfigureApi(options =>
{
    options.AddTokens(new BearerToken(Environment.GetEnvironmentVariable("PEAL_TOKEN")!));
    // A self-hosted Peal: its address. Without this, https://app.peal.social.
    options.AddApiHttpClients(client => client.BaseAddress = new Uri("https://peal.example.com"));
});

using IHost host = builder.Build();

ISessionMeApiResponse response = await host.Services.GetRequiredService<ISessionApi>().SessionMeAsync();
Console.WriteLine(response.Ok()?.User.Email);
```

Each call answers a response that says which status the server gave
(`IsOk`, `IsUnauthorized`, …) and holds the body for each: `Ok()` is null
unless the server answered 200. The [docs](docs) folder describes every API
and model.

The source lives in [`packages/peal-sdk/dotnet`](https://github.com/peal-social/peal/tree/main/packages/peal-sdk/dotnet)
of the Peal repository, generated from the API's contract. Report issues
[there](https://github.com/peal-social/peal/issues). Licensed under the
[Apache License 2.0](LICENSE).
