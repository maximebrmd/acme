using global::System.Text.Json;
using Peal.Core;

namespace Peal;

public partial class OverviewClient : IOverviewClient
{
    private readonly RawClient _client;

    internal OverviewClient(RawClient client)
    {
        _client = client;
    }

    private async Task<WithRawResponse<Overview>> GetAsyncCore(
        GetOverviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        var _queryString = new Peal.Core.QueryStringBuilder.Builder(capacity: 2)
            .Add("cursor", request.Cursor)
            .Add("limit", request.Limit)
            .MergeAdditional(options?.AdditionalQueryParameters)
            .Build();
        var _headers = await new Peal.Core.HeadersBuilder.Builder()
            .Add(_client.Options.Headers)
            .Add(_client.Options.AdditionalHeaders)
            .Add(options?.AdditionalHeaders)
            .BuildAsync()
            .ConfigureAwait(false);
        var response = await _client
            .SendRequestAsync(
                new JsonRequest
                {
                    Method = HttpMethod.Get,
                    Path = "api/me/overview",
                    QueryString = _queryString,
                    Headers = _headers,
                    Options = options,
                },
                cancellationToken
            )
            .ConfigureAwait(false);
        if (response.StatusCode is >= 200 and < 400)
        {
            var responseBody = await response
                .Raw.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            try
            {
                var responseData = JsonUtils.Deserialize<Overview>(responseBody)!;
                return new WithRawResponse<Overview>()
                {
                    Data = responseData,
                    RawResponse = new Peal.RawResponse()
                    {
                        StatusCode = response.Raw.StatusCode,
                        Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                        Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                    },
                };
            }
            catch (JsonException e)
            {
                throw new PealClientApiException(
                    "Failed to deserialize response",
                    response.StatusCode,
                    responseBody,
                    e,
                    rawResponse: new Peal.RawResponse()
                    {
                        StatusCode = response.Raw.StatusCode,
                        Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                        Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                    }
                );
            }
        }
        {
            var responseBody = await response
                .Raw.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            try
            {
                switch (response.StatusCode)
                {
                    case 400:
                        throw new BadRequestError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 401:
                        throw new UnauthorizedError(
                            JsonUtils.Deserialize<UnauthenticatedEncoded>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 403:
                        throw new ForbiddenError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 429:
                        throw new TooManyRequestsError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                }
            }
            catch (JsonException)
            {
                // unable to map error response, throwing generic error
            }
            throw new PealClientApiException(
                $"Error with status code {response.StatusCode}",
                response.StatusCode,
                responseBody,
                rawResponse: new Peal.RawResponse()
                {
                    StatusCode = response.Raw.StatusCode,
                    Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                    Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                }
            );
        }
    }

    private async Task<WithRawResponse<AgendaPage>> AgendaAsyncCore(
        AgendaOverviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        var _queryString = new Peal.Core.QueryStringBuilder.Builder(capacity: 5)
            .Add("cursor", request.Cursor)
            .Add("from", request.From)
            .Add("limit", request.Limit)
            .Add("to", request.To)
            .Add("workspaceIds", request.WorkspaceIds)
            .MergeAdditional(options?.AdditionalQueryParameters)
            .Build();
        var _headers = await new Peal.Core.HeadersBuilder.Builder()
            .Add(_client.Options.Headers)
            .Add(_client.Options.AdditionalHeaders)
            .Add(options?.AdditionalHeaders)
            .BuildAsync()
            .ConfigureAwait(false);
        var response = await _client
            .SendRequestAsync(
                new JsonRequest
                {
                    Method = HttpMethod.Get,
                    Path = "api/me/agenda",
                    QueryString = _queryString,
                    Headers = _headers,
                    Options = options,
                },
                cancellationToken
            )
            .ConfigureAwait(false);
        if (response.StatusCode is >= 200 and < 400)
        {
            var responseBody = await response
                .Raw.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            try
            {
                var responseData = JsonUtils.Deserialize<AgendaPage>(responseBody)!;
                return new WithRawResponse<AgendaPage>()
                {
                    Data = responseData,
                    RawResponse = new Peal.RawResponse()
                    {
                        StatusCode = response.Raw.StatusCode,
                        Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                        Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                    },
                };
            }
            catch (JsonException e)
            {
                throw new PealClientApiException(
                    "Failed to deserialize response",
                    response.StatusCode,
                    responseBody,
                    e,
                    rawResponse: new Peal.RawResponse()
                    {
                        StatusCode = response.Raw.StatusCode,
                        Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                        Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                    }
                );
            }
        }
        {
            var responseBody = await response
                .Raw.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            try
            {
                switch (response.StatusCode)
                {
                    case 400:
                        throw new BadRequestError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 401:
                        throw new UnauthorizedError(
                            JsonUtils.Deserialize<UnauthenticatedEncoded>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 403:
                        throw new ForbiddenError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 429:
                        throw new TooManyRequestsError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                }
            }
            catch (JsonException)
            {
                // unable to map error response, throwing generic error
            }
            throw new PealClientApiException(
                $"Error with status code {response.StatusCode}",
                response.StatusCode,
                responseBody,
                rawResponse: new Peal.RawResponse()
                {
                    StatusCode = response.Raw.StatusCode,
                    Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                    Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                }
            );
        }
    }

    private async Task<WithRawResponse<ReportAcrossWorkspaces>> ReportAsyncCore(
        ReportOverviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        var _queryString = new Peal.Core.QueryStringBuilder.Builder(capacity: 4)
            .Add("days", request.Days)
            .Add("timeZone", request.TimeZone)
            .Add("cursor", request.Cursor)
            .Add("limit", request.Limit)
            .MergeAdditional(options?.AdditionalQueryParameters)
            .Build();
        var _headers = await new Peal.Core.HeadersBuilder.Builder()
            .Add(_client.Options.Headers)
            .Add(_client.Options.AdditionalHeaders)
            .Add(options?.AdditionalHeaders)
            .BuildAsync()
            .ConfigureAwait(false);
        var response = await _client
            .SendRequestAsync(
                new JsonRequest
                {
                    Method = HttpMethod.Get,
                    Path = "api/me/report",
                    QueryString = _queryString,
                    Headers = _headers,
                    Options = options,
                },
                cancellationToken
            )
            .ConfigureAwait(false);
        if (response.StatusCode is >= 200 and < 400)
        {
            var responseBody = await response
                .Raw.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            try
            {
                var responseData = JsonUtils.Deserialize<ReportAcrossWorkspaces>(responseBody)!;
                return new WithRawResponse<ReportAcrossWorkspaces>()
                {
                    Data = responseData,
                    RawResponse = new Peal.RawResponse()
                    {
                        StatusCode = response.Raw.StatusCode,
                        Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                        Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                    },
                };
            }
            catch (JsonException e)
            {
                throw new PealClientApiException(
                    "Failed to deserialize response",
                    response.StatusCode,
                    responseBody,
                    e,
                    rawResponse: new Peal.RawResponse()
                    {
                        StatusCode = response.Raw.StatusCode,
                        Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                        Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                    }
                );
            }
        }
        {
            var responseBody = await response
                .Raw.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            try
            {
                switch (response.StatusCode)
                {
                    case 400:
                        throw new BadRequestError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 401:
                        throw new UnauthorizedError(
                            JsonUtils.Deserialize<UnauthenticatedEncoded>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 403:
                        throw new ForbiddenError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 422:
                        throw new UnprocessableEntityError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 429:
                        throw new TooManyRequestsError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                }
            }
            catch (JsonException)
            {
                // unable to map error response, throwing generic error
            }
            throw new PealClientApiException(
                $"Error with status code {response.StatusCode}",
                response.StatusCode,
                responseBody,
                rawResponse: new Peal.RawResponse()
                {
                    StatusCode = response.Raw.StatusCode,
                    Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                    Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                }
            );
        }
    }

    private async Task<WithRawResponse<global::System.IO.Stream>> ReportExportAsyncCore(
        ReportExportOverviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        var _queryString = new Peal.Core.QueryStringBuilder.Builder(capacity: 2)
            .Add("days", request.Days)
            .Add("timeZone", request.TimeZone)
            .MergeAdditional(options?.AdditionalQueryParameters)
            .Build();
        var _headers = await new Peal.Core.HeadersBuilder.Builder()
            .Add(_client.Options.Headers)
            .Add(_client.Options.AdditionalHeaders)
            .Add(options?.AdditionalHeaders)
            .BuildAsync()
            .ConfigureAwait(false);
        var response = await _client
            .SendRequestAsync(
                new JsonRequest
                {
                    Method = HttpMethod.Get,
                    Path = "api/me/report/export",
                    QueryString = _queryString,
                    Headers = _headers,
                    Options = options,
                },
                cancellationToken
            )
            .ConfigureAwait(false);
        if (response.StatusCode is >= 200 and < 400)
        {
            var stream = await response.Raw.Content.ReadAsStreamAsync();
            return new WithRawResponse<global::System.IO.Stream>()
            {
                Data = stream,
                RawResponse = new Peal.RawResponse()
                {
                    StatusCode = response.Raw.StatusCode,
                    Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                    Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                },
            };
        }
        {
            var responseBody = await response
                .Raw.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            try
            {
                switch (response.StatusCode)
                {
                    case 401:
                        throw new UnauthorizedError(
                            JsonUtils.Deserialize<UnauthenticatedEncoded>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 403:
                        throw new ForbiddenError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 422:
                        throw new UnprocessableEntityError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                    case 429:
                        throw new TooManyRequestsError(
                            JsonUtils.Deserialize<object>(responseBody),
                            rawResponse: new Peal.RawResponse()
                            {
                                StatusCode = response.Raw.StatusCode,
                                Url =
                                    response.Raw.RequestMessage?.RequestUri
                                    ?? new Uri("about:blank"),
                                Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                            }
                        );
                }
            }
            catch (JsonException)
            {
                // unable to map error response, throwing generic error
            }
            throw new PealClientApiException(
                $"Error with status code {response.StatusCode}",
                response.StatusCode,
                responseBody,
                rawResponse: new Peal.RawResponse()
                {
                    StatusCode = response.Raw.StatusCode,
                    Url = response.Raw.RequestMessage?.RequestUri ?? new Uri("about:blank"),
                    Headers = ResponseHeaders.FromHttpResponseMessage(response.Raw),
                }
            );
        }
    }

    /// <summary>
    /// Answers what needs attention in each workspace the user belongs to, 50 a page at most, by name then id: the posts going out in the next 7 days, those waiting for an approval (and whether the user may approve them), those that finished in the last 7 days with a channel that failed or that must be checked; the channels connected, to reconnect and turned off; the inbox's threads waiting for an answer; and whether the workspace is over its plan. Each section is given only where the user's role in that workspace may read it, with the permission its own page takes (`post:read`, `channel:read`, `engagement:read`), and is null otherwise, never zero; a workspace that refuses the user, as one that requires two-step verification while the account does not have it on, is listed with its name, `refused`, and no figure at all. Pass the page's `nextCursor` as `cursor` for the next one; a cursor no page gave is a bad request. API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.
    /// </summary>
    /// <example><code>
    /// await client.Overview.GetAsync(new GetOverviewRequest());
    /// </code></example>
    public WithRawResponseTask<Overview> GetAsync(
        GetOverviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        return new WithRawResponseTask<Overview>(GetAsyncCore(request, options, cancellationToken));
    }

    /// <summary>
    /// Lists the posts with a time from `from` (included) to `to` (excluded), at most 31 days apart (InvalidTimeRange otherwise), across the workspaces where the user may read posts (`post:read`), or only those of them that `workspaceIds` names (comma-separated ids). Posts waiting for an approval, scheduled, publishing and finished are listed; drafts and cancelled posts are not. They come by time, then id, 50 a page unless `limit` (at most 100) says otherwise; pass the page's `nextCursor` as `cursor`, with the same query, for the next one. Each post is light: its workspace, its time and zone, its status, its platforms (null where the user may not read the workspace's channels) and the first 140 characters of its text. API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.
    /// </summary>
    /// <example><code>
    /// await client.Overview.AgendaAsync(new AgendaOverviewRequest { From = "from", To = "to" });
    /// </code></example>
    public WithRawResponseTask<AgendaPage> AgendaAsync(
        AgendaOverviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        return new WithRawResponseTask<AgendaPage>(
            AgendaAsyncCore(request, options, cancellationToken)
        );
    }

    /// <summary>
    /// Answers what went out in each workspace the user belongs to and how it did, 50 workspaces a page at most, by name then id: each workspace's totals of the posts published in the range (likes, reposts, replies, quotes, impressions, clicks, reach, saves; null where no platform of the workspace gives one, never zero), followers and their change, and the same for the range before with `previousKept` (false where a platform's terms keep less than the range before goes back: show no change then), as that workspace's own dashboard answers them. The range is `days` (7, 30 or 90, 30 unless given: that many days ending today in `timeZone`, an IANA zone such as Europe/Paris), beside the range before, of the same length. `analytics` is null where the user's role may not read the workspace's analytics (`analytics:read`), and in a workspace that refuses the user (`refused`). Figures of different platforms are not alike: compare a workspace with itself, not with another. Pass the page's `nextCursor` as `cursor` for the next one. API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.
    /// </summary>
    /// <example><code>
    /// await client.Overview.ReportAsync(new ReportOverviewRequest { TimeZone = "timeZone" });
    /// </code></example>
    public WithRawResponseTask<ReportAcrossWorkspaces> ReportAsync(
        ReportOverviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        return new WithRawResponseTask<ReportAcrossWorkspaces>(
            ReportAsyncCore(request, options, cancellationToken)
        );
    }

    /// <summary>
    /// Streams the report across workspaces as a CSV file, RFC 4180: a header line, then one line a workspace the user belongs to, by name then id, with the columns `workspaceId`, `workspace`, `from`, `to`, `posts`, `likes`, `reposts`, `replies`, `quotes`, `impressions`, `clicks`, `reach`, `saves`, `engagement`, `followers`, `followersGained`, `previousKept`, `previousPosts`, `previousLikes`, `previousReposts`, `previousReplies`, `previousQuotes`, `previousImpressions`, `previousClicks`, `previousReach`, `previousSaves`, `previousEngagement`, `previousFollowers`, `previousFollowersGained`. A count no platform gives, a workspace whose analytics the user may not read, and the range before where `previousKept` is false, are empty cells; every text cell is in quotes, and one a spreadsheet would take for a formula, at its start or after a semicolon, starts with an apostrophe. The range is `days` (7, 30 or 90, 30 unless given: that many days ending today in `timeZone`, an IANA zone such as Europe/Paris), beside the range before, of the same length. API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.
    /// </summary>
    /// <example><code>
    /// await client.Overview.ReportExportAsync(new ReportExportOverviewRequest { TimeZone = "timeZone" });
    /// </code></example>
    public WithRawResponseTask<global::System.IO.Stream> ReportExportAsync(
        ReportExportOverviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        return new WithRawResponseTask<global::System.IO.Stream>(
            ReportExportAsyncCore(request, options, cancellationToken)
        );
    }
}
