# frozen_string_literal: true

module Peal
  module Posts
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the
      # page's `nextCursor` as `cursor` for the next one. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :cursor
      # @option params [String, nil] :limit
      #
      # @example
      #   client.posts.drafts(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::DraftPage]
      def drafts(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/drafts",
          query: query_params,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::DraftPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled
      # instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are,
      # with the time they had. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :from
      # @option params [String] :to
      #
      # @example
      #   client.posts.list(
      #     workspace_id: "workspaceId",
      #     from: "from",
      #     to: "to"
      #   )
      #
      # @return [Array[Peal::Types::Post]]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["to"] = params[:to] if params.key?(:to)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts",
          query: query_params,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          Peal::Internal::Types::Utils.coerce(Internal::Types::Array[Peal::Types::Post], (response.body.to_s.empty? ? nil : JSON.parse(response.body, symbolize_names: true)))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform
      # takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text,
      # media and options are checked against each platform's rules when it is scheduled, not before. It may name
      # channel sets (`channelSets`, by id or name), whose connected channels it is for as well, with the options each
      # set keeps; a channel of a set that is no longer connected is left out, and the answer says so (`warnings`). A
      # channel on which it gives no options takes the channel's default options, if it has some. With
      # `defaultSignatures`, each channel's default signature goes under its text, and `signatureId` puts one signature
      # under it on every channel: a signature is then text of the post, never added under a text that already ends with
      # it. Needs post:create, channel:read, and media:read when it shows media.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::PostDraft]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.posts.create(
      #     workspace_id: "workspaceId",
      #     channel_ids: ["channelIds"],
      #     content: {
      #       media: [{
      #         altText: "altText",
      #         mediaId: "mediaId"
      #       }],
      #       overrides: [{
      #         channelId: "channelId",
      #         text: "text"
      #       }],
      #       text: "text"
      #     }
      #   )
      #
      # @return [Peal::Types::Post]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts",
          body: Peal::Types::PostDraft.new(body_params).to_h,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the workspace's posts, whatever their state, a page at a time: 20 unless `limit` (at most 100) says
      # otherwise. Every filter given must hold: `status` (draft, scheduled, publishing, finished, cancelled), `outcome`
      # (how a finished post ended, such as `failed` or `partiallyPublished`), `channelId` (posts with a target on that
      # channel), `platform` (posts with a target on a connected channel of that platform), `tagId` (posts filed under
      # that tag), `queueId` (posts that queue placed), `removed` (`true`: posts Peal deleted from at least one
      # channel's platform; `false`: posts deleted from none), `from` (included) and `to` (excluded), on the scheduled
      # instant, which leave out posts without a time, `createdVia` (`web`, `apiKey` or `application`) and `authorId`.
      # `sort` orders them by creation (`createdDesc`, the default, or `createdAsc`) or by scheduled instant
      # (`scheduledDesc`, `scheduledAsc`, which list only posts with a time). Pass the page's `nextCursor` as `cursor`,
      # with the same filters and sort, for the next page: a cursor marks where its page ended, so posts created, moved
      # or deleted meanwhile make no page repeat or skip one; a cursor of another sort, or none a page gave, is a bad
      # request. Each post comes whole, with its targets, their status, address and failure reason, and `channels` gives
      # the platform of each channel the page names. Needs post:read and channel:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :author_id
      # @option params [String, nil] :channel_id
      # @option params [Peal::Types::PostOriginVia, nil] :created_via
      # @option params [String, nil] :cursor
      # @option params [String, nil] :from
      # @option params [String, nil] :limit
      # @option params [Peal::Types::PostOutcome, nil] :outcome
      # @option params [Peal::Types::Platform, nil] :platform
      # @option params [String, nil] :queue_id
      # @option params [Peal::Posts::Types::SearchPostsRequestRemoved, nil] :removed
      # @option params [Peal::Types::PostSort, nil] :sort
      # @option params [Peal::Types::PostStatus, nil] :status
      # @option params [String, nil] :tag_id
      # @option params [String, nil] :to
      #
      # @example
      #   client.posts.search(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::PostPage]
      def search(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["authorId"] = params[:author_id] if params.key?(:author_id)
        query_params["channelId"] = params[:channel_id] if params.key?(:channel_id)
        query_params["createdVia"] = params[:created_via] if params.key?(:created_via)
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["outcome"] = params[:outcome] if params.key?(:outcome)
        query_params["platform"] = params[:platform] if params.key?(:platform)
        query_params["queueId"] = params[:queue_id] if params.key?(:queue_id)
        query_params["removed"] = params[:removed] if params.key?(:removed)
        query_params["sort"] = params[:sort] if params.key?(:sort)
        query_params["status"] = params[:status] if params.key?(:status)
        query_params["tagId"] = params[:tag_id] if params.key?(:tag_id)
        query_params["to"] = params[:to] if params.key?(:to)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/search",
          query: query_params,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::PostPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at
      # once, `at` an instant, kept with its IANA time zone, or `queue`, which puts it on the next free slot of a queue
      # (`queueId`, or the workspace's default queue), decided when the request is received so that posts sent together
      # never take the same slot; it is then an ordinary scheduled post, through every rule a time chosen by hand goes
      # through, the plan's room counted in the slot's month (PlanLimitReached, never a later month), and with no
      # channel or channel set named it goes to the queue's (QueueHasNoRoom when the queue has no free slot within 366
      # days). Instead of listing channels, or beside them, it may name channel sets (`channelSets`, by id or name): it
      # goes to their connected channels, with the options each set keeps where it gives none, and a channel of a set
      # that is no longer connected is left out and told in the answer's `warnings`, never silently; a set none of whose
      # channels is left, with no other channel, is refused (UnknownChannels). A channel on which it gives no options
      # takes the channel's default options. `defaultSignatures` puts each channel's default signature under its text,
      # and `signatureId` one signature on every channel: signatures are text of the post, counted against each
      # platform's limit, and never added twice. It goes through every rule scheduling a draft does (each platform's
      # limits on text, media and options, the account's own, the plan's), and answers every violation at once
      # (PostContentInvalid): nothing is made then. In a workspace that asks for approvals, a post that needs one is
      # answered with the status `awaitingApproval`: it keeps its time and goes out only once it is approved. What it
      # publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time,
      # cancel or unschedule it. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters,
      # such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers
      # the post the first request made, as it now stands, and makes no other; the same key with another body is refused
      # (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as
      # digests. Apart from keys, a post whose content already goes to one of its channels less than 23 hours from its
      # time is refused (DuplicatePost), as a request made twice by mistake would be, unless it says `allowDuplicate:
      # true`; scheduling a draft is not checked. It answers as soon as the post is made, while it publishes, unless
      # `wait` says to wait for the outcome: up to that many seconds (60 at most) for a post that goes out now, the
      # answer is then the post once every channel has its result (`status` `finished`, with its `outcome`, each target
      # `published` with its `permalink` or `failed` with its `failureReason`), or the post as it stands when the time
      # runs out, some targets still `pending` or `publishing`: it goes on publishing, and `GET
      # …/posts/{postId}/outcome` waits for the rest. The answer is 201 either way: the post was made. Needs
      # post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope
      # workspace:publish.
      #
      # @param request_options [Hash]
      # @param params [Peal::Posts::Types::NewPost]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :wait
      # @option params [String, nil] :idempotency_key
      #
      # @example
      #   client.posts.send_(
      #     workspace_id: "workspaceId",
      #     channel_ids: ["channelIds"],
      #     content: {
      #       media: [{
      #         altText: "altText",
      #         mediaId: "mediaId"
      #       }],
      #       overrides: [{
      #         channelId: "channelId",
      #         text: "text"
      #       }],
      #       text: "text"
      #     }
      #   )
      #
      # @return [Peal::Types::Post]
      def send_(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Posts::Types::NewPost.new(params).to_h
        non_body_param_names = %w[workspaceId wait idempotency-key]
        body = request_data.except(*non_body_param_names)

        query_params = {}
        query_params["wait"] = params[:wait] if params.key?(:wait)

        headers = {}
        headers["idempotency-key"] = params[:idempotency_key] if params[:idempotency_key]

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/send",
          headers: headers,
          query: query_params,
          body: body,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded,
            402 => Peal::Types::PlanLimitReachedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Creates and sends up to 50 posts in one request, each as `send` would: one post per item, each with its own
      # channels, content, options and time, so the same content at several times, or at a time of its own on each
      # channel, is several items. Items are taken in order, one at a time, each on its own: one refused keeps none of
      # the others from being made, and nothing is undone. The answer is 200 whenever the request itself was read, even
      # if every item was refused: `items` says, for each by its place in the request, `created` with its post, or
      # `refused` with what `send` would have answered for it alone (its content's violations, unknown channels or
      # media, a time gone by, the plan's limit, a duplicate). A request that cannot be read at all (malformed, no item,
      # more than 50) is 400, and makes nothing. The plan's limits hold across the request: once the month has no room,
      # the items left are refused. Each item is checked against the posts made before it, the request's earlier items
      # included, for the same content on the same channel (DuplicatePost). An `Idempotency-Key` header makes the whole
      # request safe to send again within 24 hours: each item is kept under the key and its place, so the same request
      # sent again answers the posts it made (`replayed`), makes those that were not made the first time if they now can
      # be, and an item that changed under the same key is refused (IdempotencyKeyReused). An item's own
      # `idempotencyKey` is used instead of the header's for that item. Needs post:schedule and channel:read, and
      # media:read for the items that show media; an OAuth client needs the scope workspace:publish.
      #
      # @param request_options [Hash]
      # @param params [Peal::Posts::Types::BulkPosts]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :idempotency_key
      #
      # @example
      #   client.posts.bulk(
      #     workspace_id: "workspaceId",
      #     posts: [{
      #       channelIds: ["channelIds"],
      #       content: {
      #         media: [{
      #           altText: "altText",
      #           mediaId: "mediaId"
      #         }],
      #         overrides: [{
      #           channelId: "channelId",
      #           text: "text"
      #         }],
      #         text: "text"
      #       }
      #     }]
      #   )
      #
      # @return [Peal::Types::BulkResult]
      def bulk(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Posts::Types::BulkPosts.new(params).to_h
        non_body_param_names = %w[workspaceId idempotency-key]
        body = request_data.except(*non_body_param_names)

        headers = {}
        headers["idempotency-key"] = params[:idempotency_key] if params[:idempotency_key]

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/bulk",
          headers: headers,
          body: body,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::BulkResult.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Creates and sends the posts a CSV file lists, one per row, at most 100 rows under its first line, which names
      # the columns, in any order: `text` and `channels` (channel ids separated by spaces, commas or semicolons) are
      # required columns, `at` too (`now`, an instant with its offset such as 2026-11-20T09:00:00Z, or a local time
      # without one such as 2026-11-20 10:00, read in the row's `time_zone`, an IANA zone, UTC if left out); `media`
      # (ids of ready media of the workspace), `allow_duplicate` (`true` or `false`) and `idempotency_key` are optional.
      # Cells follow RFC 4180, strictly: a cell with a comma, a quote or a line break is written between double quotes,
      # a quote inside it doubled; a quote anywhere else is ImportUnreadable (`strayQuote`). Blank lines are no rows.
      # The file is checked first, every row, as `validate` checks a post and as the file it is (a row an earlier row
      # leaves no room for in its month, one that repeats an earlier row's content near its time, and one that carries
      # an earlier row's key with another post are refused; a row with more or fewer cells than the first line names is
      # unreadable, never guessed); unless every row is valid, nothing is made, and `rows` says which are `valid`,
      # `refused` (with what `send` would have answered) or `unreadable` (with the cells at fault). `dryRun` stops there
      # even when every row is valid. Otherwise the rows are then made in order as `bulk` makes its items, each
      # `created` or, when something changed since the check or a row repeats an earlier one, `refused`. The answer is
      # 200 once the file was read; a file that cannot be read at all is ImportUnreadable. An `Idempotency-Key` header
      # works as on `bulk`, by row. Needs post:schedule, post:read and channel:read, and media:read for rows with media;
      # an OAuth client needs the scope workspace:publish.
      #
      # @param request_options [Hash]
      # @param params [Peal::Posts::Types::PostImport]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :idempotency_key
      #
      # @example
      #   client.posts.import(
      #     workspace_id: "workspaceId",
      #     csv: "csv"
      #   )
      #
      # @return [Peal::Types::ImportResult]
      def import(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Posts::Types::PostImport.new(params).to_h
        non_body_param_names = %w[workspaceId idempotency-key]
        body = request_data.except(*non_body_param_names)

        headers = {}
        headers["idempotency-key"] = params[:idempotency_key] if params[:idempotency_key]

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/import",
          headers: headers,
          body: body,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::ImportResult.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Checks a post without making it, and changes nothing: send what `send` takes, or a draft (no `when`). It answers
      # 200 whether or not the post would go through, with `valid` and everything that would refuse it, all at once: per
      # channel, the text the channel receives, counted as its platform counts it against each of its limits, its
      # hashtags, mentions, links and media, and every violation of the platform's rules (text, media formats, sizes,
      # counts and durations, options) and of the account's own where its platform tells them; the channels and media
      # that are not the workspace's; and, when `when` is given, whether the time can be kept (for `queue`, the slot it
      # would take now, `queueSlot`, or why there is none, `queueNoRoom`: QueueNotFound when the queue is not the
      # workspace's), whether the workspace's plan has room, and the channels that already have the same content from
      # another post (`duplicates`, as DuplicatePost tells them; none with `allowDuplicate`). A post that is valid now
      # can still be refused later: a channel disconnected, a plan's month filled meanwhile. Needs post:read and
      # channel:read, and media:read when it shows media.
      #
      # @param request_options [Hash]
      # @param params [Peal::Posts::Types::PostToValidate]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.posts.validate(
      #     workspace_id: "workspaceId",
      #     channel_ids: ["channelIds"],
      #     content: {
      #       media: [{
      #         altText: "altText",
      #         mediaId: "mediaId"
      #       }],
      #       overrides: [{
      #         channelId: "channelId",
      #         text: "text"
      #       }],
      #       text: "text"
      #     }
      #   )
      #
      # @return [Peal::Types::PostValidation]
      def validate(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Posts::Types::PostToValidate.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/validate",
          body: body,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::PostValidation.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers with a post of the workspace. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.get(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::Post]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Replaces a draft's content, channels and options: options left out are removed. Its tags are replaced by
      # `tagIds` when given, and kept otherwise. A post that is no longer a draft is a conflict. Needs post:update,
      # channel:read, and media:read when it shows media.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::PostDraft]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.update(
      #     workspace_id: "workspaceId",
      #     post_id: "postId",
      #     channel_ids: ["channelIds"],
      #     content: {
      #       media: [{
      #         altText: "altText",
      #         mediaId: "mediaId"
      #       }],
      #       overrides: [{
      #         channelId: "channelId",
      #         text: "text"
      #       }],
      #       text: "text"
      #     }
      #   )
      #
      # @return [Peal::Types::Post]
      def update(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id post_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PUT",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}",
          body: Peal::Types::PostDraft.new(body_params).to_h,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update
      # for the user who created the draft.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.discard(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [untyped]
      def discard(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        return if code.between?(200, 299)

        error_class = Peal::Errors::ResponseError.subclass_for_code(code)
        error_types = {
          401 => Peal::Types::UnauthenticatedEncoded
        }
        error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
        raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
      end

      # Answers with a post once it has gone out: it waits up to `wait` seconds (60 at most; none unless given) until
      # every channel has its result, and answers the post then (`status` `finished`), or as it stands when the time
      # runs out, which a client asks again. A draft, a cancelled post and a post scheduled for later than the wait are
      # answered at once. Waiting changes nothing and holds nothing: the post publishes in its own job either way. Needs
      # post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      # @option params [String, nil] :wait
      #
      # @example
      #   client.posts.outcome(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::Post]
      def outcome(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["wait"] = params[:wait] if params.key?(:wait)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/outcome",
          query: query_params,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An
      # attempt still in progress is not listed yet. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.attempts(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Array[Peal::Types::PublicationAttempt]]
      def attempts(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/attempts",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          Peal::Internal::Types::Utils.coerce(Internal::Types::Array[Peal::Types::PublicationAttempt], (response.body.to_s.empty? ? nil : JSON.parse(response.body, symbolize_names: true)))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Files a post under these tags of the workspace, 10 at most, instead of those it had; an empty list takes them
      # all off. Tags say nothing to the platforms, so a post takes them whatever its status, sent or not. Needs
      # post:update.
      #
      # @param request_options [Hash]
      # @param params [Peal::Posts::Types::PostTags]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.tag(
      #     workspace_id: "workspaceId",
      #     post_id: "postId",
      #     tag_ids: ["tagIds"]
      #   )
      #
      # @return [Peal::Types::Post]
      def tag(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Posts::Types::PostTags.new(params).to_h
        non_body_param_names = %w[workspaceId postId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PUT",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/tags",
          body: body,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Makes a new draft that says what the post says, whatever the post's status: its text, its media, its channels
      # with their text and options, and its tags. What the workspace no longer has is left out rather than refused: a
      # channel disconnected since, with the text the post had there, media deleted since, a tag deleted since. The copy
      # has no time, and its author is whoever asked; the post itself is not changed. Needs post:read and post:create,
      # and channel:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.duplicate(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::Post]
      def duplicate(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/duplicate",
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen
      # in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions,
      # alt text, how many videos, and whether images and videos go together. A channel whose platform takes options
      # needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet.
      # A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must
      # fit the workspace's plan (PlanLimitReached). Where the workspace asks for an approval of this post (its approval
      # policy), the post is not scheduled: it answers with the status `awaitingApproval`, keeps its time, and goes out
      # only once approved; contributors may then ask too, with post:create. Needs post:schedule and channel:read, and
      # media:read when it shows media.
      #
      # @param request_options [Hash]
      # @param params [Peal::Posts::Types::SchedulePost]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.schedule(
      #     workspace_id: "workspaceId",
      #     post_id: "postId",
      #     at: "at",
      #     channel_ids: ["channelIds"],
      #     time_zone: "timeZone"
      #   )
      #
      # @return [Peal::Types::Post]
      def schedule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Posts::Types::SchedulePost.new(params).to_h
        non_body_param_names = %w[workspaceId postId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/schedule",
          body: body,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded,
            402 => Peal::Types::PlanLimitReachedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Moves a scheduled post, or one awaiting approval, to another instant, or schedules a draft on the channels it
      # has. A post that needs an approval it does not have waits for it (`awaitingApproval`). Moved to another month,
      # or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule,
      # and channel:read for a draft.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::PostSchedule]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.reschedule(
      #     workspace_id: "workspaceId",
      #     post_id: "postId",
      #     at: "at",
      #     time_zone: "timeZone"
      #   )
      #
      # @return [Peal::Types::Post]
      def reschedule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id post_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/reschedule",
          body: Peal::Types::PostSchedule.new(body_params).to_h,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded,
            402 => Peal::Types::PlanLimitReachedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Puts a post on the next free slot of a queue (`queueId`, or the workspace's default queue), decided when the
      # request is received so that posts added together never take the same slot. A draft is scheduled there as
      # `schedule` schedules it, on `channelIds` when given, on the channels it has otherwise, or, when it has none,
      # where the same content sent with `when: queue` would go: the queue's connected channels and its channel set's,
      # with the options the set keeps and the channels' default options; a channel of either that is no longer
      # connected is left out and told in `warnings` (`queueChannelsDropped`, `channelsDropped`), and none left is
      # UnknownChannels; a scheduled post, or one awaiting approval, is moved there as `reschedule` moves it, on the
      # channels it has. Every rule of scheduling applies at that time, the approval gate and the plan's room in the
      # slot's month included (PlanLimitReached, never a later month). A queue without a free slot within 366 days is
      # QueueHasNoRoom, and nothing is changed. Needs post:schedule and channel:read.
      #
      # @param request_options [Hash]
      # @param params [Peal::Posts::Types::QueuePost]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.enqueue(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::Post]
      def enqueue(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Posts::Types::QueuePost.new(params).to_h
        non_body_param_names = %w[workspaceId postId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/queue",
          body: body,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded,
            402 => Peal::Types::PlanLimitReachedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is
      # scheduled again. A post already publishing is a conflict. Needs post:schedule.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.unschedule(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::Post]
      def unschedule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/unschedule",
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts.
      # Check the platform first when it is unconfirmed, as it may be live already. A post of several parts goes on from
      # the part after the last that is live; one failed as `partsNotSent` is refused (TargetStatusConflict), as Peal
      # has no post to send the rest under: a part found by hand has no id, or the part to reply to is gone. Needs
      # post:schedule.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      # @option params [String] :target_id
      #
      # @example
      #   client.posts.repost(
      #     workspace_id: "workspaceId",
      #     post_id: "postId",
      #     target_id: "targetId"
      #   )
      #
      # @return [Peal::Types::Post]
      def repost(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/targets/#{URI.encode_uri_component(params[:target_id].to_s)}/repost",
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you
      # have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs
      # post:schedule.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::TargetConfirmation]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      # @option params [String] :target_id
      #
      # @example
      #   client.posts.confirm(
      #     workspace_id: "workspaceId",
      #     post_id: "postId",
      #     target_id: "targetId"
      #   )
      #
      # @return [Peal::Types::Post]
      def confirm(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id post_id target_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/targets/#{URI.encode_uri_component(params[:target_id].to_s)}/confirm",
          body: Peal::Types::TargetConfirmation.new(body_params).to_h,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Deletes the post from one channel's platform, for everyone: every part of a thread, the last first, so a
      # deletion that stops midway leaves a shorter thread that still reads from its start. It cannot be undone from
      # Peal. The request is accepted (202) and a job deletes it, one call at a time with the channel's other calls; a
      # part the platform no longer has counts as deleted (`alreadyGone`), and a call that fails is tried again (as long
      # as the platform asks to wait, and five more times while it cannot be reached), after which the change is
      # `failed` with its `code` and asking again deletes the parts left. `wait` waits up to that many seconds (60 at
      # most) for the change to end, and answers it as it then stands. Once done, the target keeps the status
      # `published` with its `removedAt` (the month's count and the usage stay, as the post did go out), analytics stops
      # reading it and keeps what it read, and the inbox stops reading its comments and keeps those it has. Refused
      # (LivePostNotChangeable) before anything is called where it is not live there, was deleted already, Peal has no
      # id for a part of it, the platform does not let Peal delete it (the capabilities' `livePost` say so beforehand),
      # another change of it is pending, the channel cannot be used, or a boost that is not over shows it. Webhooks hear
      # `post.unpublished` or `post.unpublish_failed`. Needs post:publish; an OAuth client needs the scope
      # workspace:publish.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      # @option params [String] :target_id
      # @option params [String, nil] :wait
      #
      # @example
      #   client.posts.unpublish_target(
      #     workspace_id: "workspaceId",
      #     post_id: "postId",
      #     target_id: "targetId"
      #   )
      #
      # @return [Peal::Types::LivePostChange]
      def unpublish_target(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["wait"] = params[:wait] if params.key?(:wait)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/targets/#{URI.encode_uri_component(params[:target_id].to_s)}/unpublish",
          query: query_params,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::LivePostChange.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Deletes the post from every channel's platform where it can be, as unpublishing it on each channel does, and
      # answers the change made on each (`changes`) and, beside them, why it could not be on the others (`refused`, each
      # with the target and the reason LivePostNotChangeable gives): one channel that cannot never fails the whole
      # request. It cannot be undone from Peal. Needs post:publish; an OAuth client needs the scope workspace:publish.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.unpublish(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::PostUnpublish]
      def unpublish(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/unpublish",
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::PostUnpublish.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the changes asked of the post once it was live (deleting it from a channel's platform), newest first, each
      # with where it stands: `pending`, `done` or `failed` with its `code`. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.changes(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::LivePostChanges]
      def changes(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/changes",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::LivePostChanges.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Cancels a draft, a scheduled post or one awaiting approval. A post already publishing finishes with what its
      # channels did: those not yet sent are cancelled. Needs post:schedule.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :post_id
      #
      # @example
      #   client.posts.cancel(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::Post]
      def cancel(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/#{URI.encode_uri_component(params[:post_id].to_s)}/cancel",
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Post.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end
    end
  end
end
