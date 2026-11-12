# frozen_string_literal: true

module Peal
  module ShortLinks
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Answers whether this server shortens links (`available`), what a short address starts with (`base`) and how long
      # it is (`shortLength`), and whether the workspace's new posts ask for short links by default (`byDefault`). A
      # post that asks (`shortenLinks`) goes out with each link written with `http://` or `https://` and longer than a
      # short address replaced by one, one per channel and link, which redirects to it and counts the visit; the text
      # kept stays as written, and Pinterest, Instagram and TikTok always get links as written, as does a link to a
      # channel's own platform. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.short_links.status(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::ShortLinkStatus]
      def status(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/short-links/status",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::ShortLinkStatus.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sets whether the workspace's new posts ask for short links unless their author says otherwise; each post still
      # chooses for itself. Needs organization:update, which owners and admins hold.
      #
      # @param request_options [Hash]
      # @param params [Peal::ShortLinks::Types::ShortLinkSettings]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.short_links.set_default(
      #     workspace_id: "workspaceId",
      #     by_default: true
      #   )
      #
      # @return [Peal::Types::ShortLinkStatus]
      def set_default(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::ShortLinks::Types::ShortLinkSettings.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PUT",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/short-links/settings",
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
          (response.body.to_s.empty? ? nil : Peal::Types::ShortLinkStatus.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the workspace's short links, newest first, 50 a page unless `limit` (at most 100) says otherwise, those of
      # one post (`postId`) or one channel (`channelId`), each with its clicks from `from` to `to` (UTC days, both
      # included, at most 92; by default the 30 days that end today). Pass the page's `nextCursor` as `cursor` for the
      # next one. Clicks are counted by UTC day and kept 400 days; a request from an automated reader (a crawler, a link
      # preview), a prefetch or a HEAD is redirected but not counted, so the figure is approximate, and nothing about
      # the visitor is kept. Needs analytics:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :channel_id
      # @option params [String, nil] :cursor
      # @option params [String, nil] :from
      # @option params [String, nil] :limit
      # @option params [String, nil] :post_id
      # @option params [String, nil] :to
      #
      # @example
      #   client.short_links.list(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::ShortLinkPage]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["channelId"] = params[:channel_id] if params.key?(:channel_id)
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["postId"] = params[:post_id] if params.key?(:post_id)
        query_params["to"] = params[:to] if params.key?(:to)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/short-links",
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
          (response.body.to_s.empty? ? nil : Peal::Types::ShortLinkPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers one short link with its clicks each day from `from` to `to` (UTC days, both included, at most 92; by
      # default the 30 days that end today), oldest first. Clicks are counted by UTC day and kept 400 days; a request
      # from an automated reader (a crawler, a link preview), a prefetch or a HEAD is redirected but not counted, so the
      # figure is approximate, and nothing about the visitor is kept. Needs analytics:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :link_id
      # @option params [String, nil] :from
      # @option params [String, nil] :to
      #
      # @example
      #   client.short_links.get(
      #     workspace_id: "workspaceId",
      #     link_id: "linkId"
      #   )
      #
      # @return [Peal::Types::ShortLinkReport]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["to"] = params[:to] if params.key?(:to)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/short-links/#{URI.encode_uri_component(params[:link_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::ShortLinkReport.load(response.body))
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
