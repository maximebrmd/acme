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
      # media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create,
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

      # Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at
      # once, or `at` an instant, kept with its IANA time zone. It goes through every rule scheduling a draft does (each
      # platform's limits on text, media and options, the account's own, the plan's), and answers every violation at
      # once (PostContentInvalid): nothing is made then. What it publishes reaches the platforms' public, and cannot be
      # taken back from Peal once it is out; until its time, cancel or unschedule it. Send an `Idempotency-Key` header
      # (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within
      # 24 hours, the same key with the same body answers the post the first request made, as it now stands, and makes
      # no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that
      # post was deleted. Keys are kept per workspace, as digests. Needs post:schedule and channel:read, and media:read
      # when it shows media; an OAuth client needs the scope workspace:publish.
      #
      # @param request_options [Hash]
      # @param params [Peal::Posts::Types::NewPost]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
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
        non_body_param_names = %w[workspaceId idempotency-key]
        body = request_data.except(*non_body_param_names)

        headers = {}
        headers["idempotency-key"] = params[:idempotency_key] if params[:idempotency_key]

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/posts/send",
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

      # Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft
      # is a conflict. Needs post:update, channel:read, and media:read when it shows media.
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

      # Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen
      # in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions,
      # alt text, how many videos, and whether images and videos go together. A channel whose platform takes options
      # needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet.
      # A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must
      # fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows
      # media.
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

      # Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month,
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
      # Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.
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

      # Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not
      # yet sent are cancelled. Needs post:schedule.
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
