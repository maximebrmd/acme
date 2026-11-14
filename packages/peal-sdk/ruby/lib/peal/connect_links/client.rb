# frozen_string_literal: true

module Peal
  module ConnectLinks
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's connect links, newest first, the last 100: those waiting, and those used, revoked or
      # expired in the last 30 days. Needs channel:read.
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
      #   client.connect_links.list(workspace_id: "workspaceId")
      #
      # @return [Array[Peal::Types::ConnectLink]]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/connect-links",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          Peal::Internal::Types::Utils.coerce(Internal::Types::Array[Peal::Types::ConnectLink], (response.body.to_s.empty? ? nil : JSON.parse(response.body, symbolize_names: true)))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Creates a link to hand to whoever owns an account of `platform`, or accounts of each of `platforms`: it opens a
      # hosted page where they sign in at the platform and, when the sign-in reaches several accounts, pick those to
      # connect, without a Peal account. With `platforms`, the page offers each in turn, and the link waits until each
      # one connected an account, or it is revoked or expires: `connectedPlatforms` and `channelIds` say what it
      # connected so far. The answer holds the link's address, shown this once. The link works once, for 168 hours
      # unless `expiresInHours` (1 to 720) says otherwise; with `channelId`, it reconnects that channel, and only a
      # sign-in to the channel's own account goes through. `returnUrl` is where the page sends them once done, with
      # `peal_link` (the link's id) and `peal_status` (`connected`, `cancelled` or `failed`) in its query: read the link
      # by its id to know what was connected, as anyone can write those parameters. Its origin must be one the
      # workspace's partner account registered, exactly (422 `ReturnUrlNotAllowed` otherwise, and for a workspace
      # without a partner account). Whoever holds the address can connect an account of theirs to the workspace until it
      # is used, revoked or expired: hand it over a channel you trust, and revoke it when it is no longer needed. A
      # platform this server cannot connect answers 422 `ConnectFailed`. A workspace has 100 links waiting at most.
      # Needs channel:connect.
      #
      # @param request_options [Hash]
      # @param params [Peal::ConnectLinks::Types::NewConnectLink]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.connect_links.create(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::CreatedConnectLink]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::ConnectLinks::Types::NewConnectLink.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/connect-links",
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
          (response.body.to_s.empty? ? nil : Peal::Types::CreatedConnectLink.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # One connect link of the workspace: where it stands, the channels it connected once `completed`, and how its last
      # sign-in failed. Read it when a browser comes back to your return address, or on `channel.connected`. Needs
      # channel:read.
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
      #
      # @example
      #   client.connect_links.get(
      #     workspace_id: "workspaceId",
      #     link_id: "linkId"
      #   )
      #
      # @return [Peal::Types::ConnectLink]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/connect-links/#{URI.encode_uri_component(params[:link_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::ConnectLink.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Takes a connect link back: it opens nothing more, and a sign-in in progress through it does not complete. A link
      # already used, revoked or expired stays as it is. Answers the link as it now stands. Needs channel:connect.
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
      #
      # @example
      #   client.connect_links.revoke(
      #     workspace_id: "workspaceId",
      #     link_id: "linkId"
      #   )
      #
      # @return [Peal::Types::ConnectLink]
      def revoke(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/connect-links/#{URI.encode_uri_component(params[:link_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::ConnectLink.load(response.body))
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
