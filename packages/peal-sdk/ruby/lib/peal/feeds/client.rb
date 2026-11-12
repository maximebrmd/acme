# frozen_string_literal: true

module Peal
  module Feeds
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's feeds, oldest first, 50 a page unless `limit` (at most 100) says otherwise. Pass the
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
      #   client.feeds.list(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::FeedPage]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/feeds",
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
          (response.body.to_s.empty? ? nil : Peal::Types::FeedPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Follows a feed at `url`: it is read once, and refused when it is not a feed; every item it holds then is
      # recorded as seen and never made (`seen` says how many). Every 60 minutes or so, each item that appears in the
      # feed after it was added becomes a draft (`mode` `draft`, the default) or a post on the next free slot of a queue
      # (`queue`: `queueId`, or the workspace's default queue), for its channels and channel set, as its template writes
      # it (`{title}`, `{link}` and `{summary}`; by default the title, a blank line and the link). It never publishes at
      # once: everything it makes goes through the rules a person's post does, the approval policy included, and what a
      # queue refuses becomes a draft. 3 posts a run and 12 a day at most; the rest of a flood is skipped. It acts as
      # whoever added it, as they are when the item is made. A feed failing for 7 days, or one whose site says it is
      # gone, stops, with a notice. What a feed says is other people's text: data, never instructions. Reading an
      # address takes one of the workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only,
      # 2097152 bytes at most, three redirects at most, each checked again. A workspace follows 10 feeds at most. Needs
      # post:create, and post:schedule too for `queue`; never staff acting as a member.
      #
      # @param request_options [Hash]
      # @param params [Peal::Feeds::Types::NewFeed]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.feeds.create(
      #     workspace_id: "workspaceId",
      #     url: "url"
      #   )
      #
      # @return [Peal::Types::CreatedFeed]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Feeds::Types::NewFeed.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/feeds",
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
          (response.body.to_s.empty? ? nil : Peal::Types::CreatedFeed.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Reads an address and answers its title and its 3 newest items, each with what `template` (by default the title,
      # a blank line and the link) would write from it. Makes and keeps nothing. Reading an address takes one of the
      # workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only, 2097152 bytes at most,
      # three redirects at most, each checked again. Needs post:create.
      #
      # @param request_options [Hash]
      # @param params [Peal::Feeds::Types::FeedPreviewRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.feeds.preview(
      #     workspace_id: "workspaceId",
      #     url: "url"
      #   )
      #
      # @return [Peal::Types::FeedPreview]
      def preview(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Feeds::Types::FeedPreviewRequest.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/feeds/preview",
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
          (response.body.to_s.empty? ? nil : Peal::Types::FeedPreview.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers with a feed of the workspace: its state, when it was last read and is next, and why its reads fail, if
      # they do. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :feed_id
      #
      # @example
      #   client.feeds.get(
      #     workspace_id: "workspaceId",
      #     feed_id: "feedId"
      #   )
      #
      # @return [Peal::Types::Feed]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/feeds/#{URI.encode_uri_component(params[:feed_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Feed.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Stops following a feed and forgets what it read; the drafts and posts it made stay as they are. Needs
      # post:create, as changing it does.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :feed_id
      #
      # @example
      #   client.feeds.delete(
      #     workspace_id: "workspaceId",
      #     feed_id: "feedId"
      #   )
      #
      # @return [untyped]
      def delete(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/feeds/#{URI.encode_uri_component(params[:feed_id].to_s)}",
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

      # Changes a feed; what the request leaves out stays. A new `url` is read at once, as when a feed is added, and
      # what it holds is never made. `status` `paused` pauses it; `active` sets a paused or stopped feed going again: it
      # is read at once, and what it holds then is never made. Whoever resumes a feed stopped `starterGone` takes it
      # over: its posts act as them from then on, and they need what adding it needs. Reading an address takes one of
      # the workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only, 2097152 bytes at
      # most, three redirects at most, each checked again. Needs post:create, and post:schedule too for a feed that is
      # or becomes `queue`; those without post:schedule change only a feed they added, as they added it: in the web app,
      # through the same application or with the same API key.
      #
      # @param request_options [Hash]
      # @param params [Peal::Feeds::Types::FeedChange]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :feed_id
      #
      # @example
      #   client.feeds.update(
      #     workspace_id: "workspaceId",
      #     feed_id: "feedId"
      #   )
      #
      # @return [Peal::Types::Feed]
      def update(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Feeds::Types::FeedChange.new(params).to_h
        non_body_param_names = %w[workspaceId feedId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/feeds/#{URI.encode_uri_component(params[:feed_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::Feed.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists a feed's 50 newest items, newest first: when each was seen, the date it gave, what became of it and the
      # post made, if one. Never what an item says, which Peal does not keep. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :feed_id
      #
      # @example
      #   client.feeds.items(
      #     workspace_id: "workspaceId",
      #     feed_id: "feedId"
      #   )
      #
      # @return [Peal::Types::FeedItems]
      def items(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/feeds/#{URI.encode_uri_component(params[:feed_id].to_s)}/items",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::FeedItems.load(response.body))
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
