# frozen_string_literal: true

module Peal
  module Activity
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the requests that asked to change something in the workspace, newest first, 30 a page unless `limit` (at
      # most 100) says otherwise: who asked (a member or an API key), how they authenticated, the key or the application
      # it came through, the operation, the ids its path named, the status answered and, when it was refused or failed,
      # the error's code. Requests that only read are not kept, and neither is anything a request or its answer carried.
      # `operation` keeps one operation (`posts.schedule`), `actor` what one member (a user id) or one API key (its id)
      # asked for. Pass the page's `nextCursor` as `cursor` for the next one. An event is kept 90 days. Needs
      # activity:read, which owners hold.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :actor
      # @option params [String, nil] :cursor
      # @option params [String, nil] :limit
      # @option params [String, nil] :operation
      #
      # @example
      #   client.activity.list(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::ActivityPage]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["actor"] = params[:actor] if params.key?(:actor)
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["operation"] = params[:operation] if params.key?(:operation)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/activity",
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
          (response.body.to_s.empty? ? nil : Peal::Types::ActivityPage.load(response.body))
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
