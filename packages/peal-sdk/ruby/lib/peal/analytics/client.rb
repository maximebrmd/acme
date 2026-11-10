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

      # Answers a workspace's analytics over a range in one call: the totals of the posts published in it and of those
      # published in the range before, of the same length, so a client shows the trend; followers at the end of each and
      # their change; the same by channel and by platform; each day's gains, followers and account views; and the
      # `topPosts` (5 unless said, 25 at most) with the most engagement. The range is `days` (7, 30 or 90: that many
      # days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA
      # zone such as Europe/Paris. Followers are kept from the day a channel is connected, read once a day; a number a
      # platform does not give is null, never zero. Needs analytics:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :days
      # @option params [String, nil] :from
      # @option params [String] :time_zone
      # @option params [String, nil] :to
      # @option params [String, nil] :top_posts
      #
      # @example
      #   client.analytics.dashboard(
      #     workspace_id: "workspaceId",
      #     time_zone: "timeZone"
      #   )
      #
      # @return [Peal::Types::AnalyticsDashboard]
      def dashboard(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["days"] = params[:days] if params.key?(:days)
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["timeZone"] = params[:time_zone] if params.key?(:time_zone)
        query_params["to"] = params[:to] if params.key?(:to)
        query_params["topPosts"] = params[:top_posts] if params.key?(:top_posts)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/analytics/dashboard",
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
          (response.body.to_s.empty? ? nil : Peal::Types::AnalyticsDashboard.load(response.body))
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

      # Answers one channel's numbers day by day: its followers, the accounts it follows and its posts as read each UTC
      # day, the views and reach its platform counted, and what its posts published in the range gained. The range is
      # `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most
      # 366 days; `timeZone` is an IANA zone such as Europe/Paris. A channel Peal has read nothing of answers days
      # without numbers. Needs analytics:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :channel_id
      # @option params [String, nil] :days
      # @option params [String, nil] :from
      # @option params [String] :time_zone
      # @option params [String, nil] :to
      #
      # @example
      #   client.analytics.channel(
      #     workspace_id: "workspaceId",
      #     channel_id: "channelId",
      #     time_zone: "timeZone"
      #   )
      #
      # @return [Peal::Types::ChannelSeries]
      def channel(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["days"] = params[:days] if params.key?(:days)
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["timeZone"] = params[:time_zone] if params.key?(:time_zone)
        query_params["to"] = params[:to] if params.key?(:to)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/analytics/channels/#{URI.encode_uri_component(params[:channel_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::ChannelSeries.load(response.body))
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

      # Streams the workspace's analytics as a file: `kind=posts` lists each post published in the range on each channel
      # with its latest counts, `kind=accounts` each channel's account day by day. `format=csv` (the default) writes a
      # header line then one line a row, as RFC 4180; `format=json` writes one JSON object a line
      # (`application/x-ndjson`). A number a platform does not give is empty in CSV and null in JSON. The range is
      # `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most
      # 366 days; `timeZone` is an IANA zone such as Europe/Paris. Needs analytics:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :days
      # @option params [String, nil] :from
      # @option params [String] :time_zone
      # @option params [String, nil] :to
      # @option params [Peal::Types::AnalyticsExportFormat, nil] :format
      # @option params [Peal::Types::AnalyticsExportKind] :kind
      #
      # @example
      #   client.analytics.export(
      #     workspace_id: "workspaceId",
      #     time_zone: "timeZone",
      #     kind: "posts"
      #   )
      #
      # @return [String]
      def export(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["days"] = params[:days] if params.key?(:days)
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["timeZone"] = params[:time_zone] if params.key?(:time_zone)
        query_params["to"] = params[:to] if params.key?(:to)
        query_params["format"] = params[:format] if params.key?(:format)
        query_params["kind"] = params[:kind] if params.key?(:kind)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/analytics/export",
          query: query_params,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        return response.body if code.between?(200, 299)

        error_class = Peal::Errors::ResponseError.subclass_for_code(code)
        error_types = {
          401 => Peal::Types::UnauthenticatedEncoded,
          403 => Peal::Types::ForbiddenEncoded
        }
        error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
        raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
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
