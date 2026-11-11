# frozen_string_literal: true

module Peal
  module Usage
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Answers what the workspace uses of its plan now, and day by day from `from` to `to` (UTC days, both included, at
      # most 92; by default the 30 days that end today): each day's posts that went out, one per channel they went out
      # on, by platform, and its requests to the writing assistant; the channels it connected, its members and the media
      # it stored as each day ended, null for a day the server took no snapshot of; then the period's totals, with its
      # channel-days and, for each calendar month it touches, its posts on platforms that bill the server per post.
      # Usage is kept 400 days. Counts only: nothing here is priced or limits anything. On a server that does not bill,
      # `plan` and `allowances` are null. Needs billing:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :from
      # @option params [String, nil] :to
      #
      # @example
      #   client.usage.get(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::WorkspaceUsageReport]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["to"] = params[:to] if params.key?(:to)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/usage",
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
          (response.body.to_s.empty? ? nil : Peal::Types::WorkspaceUsageReport.load(response.body))
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
