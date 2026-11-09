# frozen_string_literal: true

module Peal
  module Analytics
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone`
      # (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and
      # the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every
      # hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [Peal::Types::CalendarDay] :from
      # @option params [String] :time_zone
      # @option params [Peal::Types::CalendarDay] :to
      #
      # @example
      #   client.analytics.summary(
      #     workspace_id: "workspaceId",
      #     from: "from",
      #     time_zone: "timeZone",
      #     to: "to"
      #   )
      #
      # @return [Peal::Types::AnalyticsSummary]
      def summary(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["timeZone"] = params[:time_zone] if params.key?(:time_zone)
        query_params["to"] = params[:to] if params.key?(:to)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/analytics/summary",
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
          (response.body.to_s.empty? ? nil : Peal::Types::AnalyticsSummary.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded,
            403 => Peal::Types::ForbiddenEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose
      # counts were not read yet, has no targets. Needs analytics:read.
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
      #   client.analytics.post(
      #     workspace_id: "workspaceId",
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::PostAnalytics]
      def post(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/analytics/posts/#{URI.encode_uri_component(params[:post_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::PostAnalytics.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded,
            403 => Peal::Types::ForbiddenEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end
    end
  end
end
