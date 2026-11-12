# frozen_string_literal: true

module Peal
  module Overview
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Answers what needs attention in each workspace the user belongs to, 50 a page at most, by name then id: the
      # posts going out in the next 7 days, those waiting for an approval (and whether the user may approve them), those
      # that finished in the last 7 days with a channel that failed or that must be checked; the channels connected, to
      # reconnect and turned off; the inbox's threads waiting for an answer; and whether the workspace is over its plan.
      # Each section is given only where the user's role in that workspace may read it, with the permission its own page
      # takes (`post:read`, `channel:read`, `engagement:read`), and is null otherwise, never zero; a workspace that
      # refuses the user, as one that requires two-step verification while the account does not have it on, is listed
      # with its name, `refused`, and no figure at all. Pass the page's `nextCursor` as `cursor` for the next one; a
      # cursor no page gave is a bad request. API keys belong to a workspace, not to anyone, and get 403, as do OAuth
      # tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its
      # scopes allow there.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :cursor
      # @option params [String, nil] :limit
      #
      # @example
      #   client.overview.get
      #
      # @return [Peal::Types::Overview]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/me/overview",
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
          (response.body.to_s.empty? ? nil : Peal::Types::Overview.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the posts with a time from `from` (included) to `to` (excluded), at most 31 days apart (InvalidTimeRange
      # otherwise), across the workspaces where the user may read posts (`post:read`), or only those of them that
      # `workspaceIds` names (comma-separated ids). Posts waiting for an approval, scheduled, publishing and finished
      # are listed; drafts and cancelled posts are not. They come by time, then id, 50 a page unless `limit` (at most
      # 100) says otherwise; pass the page's `nextCursor` as `cursor`, with the same query, for the next one. Each post
      # is light: its workspace, its time and zone, its status, its platforms (null where the user may not read the
      # workspace's channels) and the first 140 characters of its text. API keys belong to a workspace, not to anyone,
      # and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every
      # workspace with what its scopes allow there.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :cursor
      # @option params [String] :from
      # @option params [String, nil] :limit
      # @option params [String] :to
      # @option params [String, nil] :workspace_ids
      #
      # @example
      #   client.overview.agenda(
      #     from: "from",
      #     to: "to"
      #   )
      #
      # @return [Peal::Types::AgendaPage]
      def agenda(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["to"] = params[:to] if params.key?(:to)
        query_params["workspaceIds"] = params[:workspace_ids] if params.key?(:workspace_ids)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/me/agenda",
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
          (response.body.to_s.empty? ? nil : Peal::Types::AgendaPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers what went out in each workspace the user belongs to and how it did, 50 workspaces a page at most, by
      # name then id: each workspace's totals of the posts published in the range (likes, reposts, replies, quotes,
      # impressions, clicks, reach, saves; null where no platform of the workspace gives one, never zero), followers and
      # their change, and the same for the range before with `previousKept` (false where a platform's terms keep less
      # than the range before goes back: show no change then), as that workspace's own dashboard answers them. The range
      # is `days` (7, 30 or 90, 30 unless given: that many days ending today in `timeZone`, an IANA zone such as
      # Europe/Paris), beside the range before, of the same length. `analytics` is null where the user's role may not
      # read the workspace's analytics (`analytics:read`), and in a workspace that refuses the user (`refused`). Figures
      # of different platforms are not alike: compare a workspace with itself, not with another. Pass the page's
      # `nextCursor` as `cursor` for the next one. API keys belong to a workspace, not to anyone, and get 403, as do
      # OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what
      # its scopes allow there.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :days
      # @option params [String] :time_zone
      # @option params [String, nil] :cursor
      # @option params [String, nil] :limit
      #
      # @example
      #   client.overview.report(time_zone: "timeZone")
      #
      # @return [Peal::Types::ReportAcrossWorkspaces]
      def report(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["days"] = params[:days] if params.key?(:days)
        query_params["timeZone"] = params[:time_zone] if params.key?(:time_zone)
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/me/report",
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
          (response.body.to_s.empty? ? nil : Peal::Types::ReportAcrossWorkspaces.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Streams the report across workspaces as a CSV file, RFC 4180: a header line, then one line a workspace the user
      # belongs to, by name then id, with the columns `workspaceId`, `workspace`, `from`, `to`, `posts`, `likes`,
      # `reposts`, `replies`, `quotes`, `impressions`, `clicks`, `reach`, `saves`, `engagement`, `followers`,
      # `followersGained`, `previousKept`, `previousPosts`, `previousLikes`, `previousReposts`, `previousReplies`,
      # `previousQuotes`, `previousImpressions`, `previousClicks`, `previousReach`, `previousSaves`,
      # `previousEngagement`, `previousFollowers`, `previousFollowersGained`. A count no platform gives, a workspace
      # whose analytics the user may not read, and the range before where `previousKept` is false, are empty cells;
      # every text cell is in quotes, and one a spreadsheet would take for a formula, at its start or after a semicolon,
      # starts with an apostrophe. The range is `days` (7, 30 or 90, 30 unless given: that many days ending today in
      # `timeZone`, an IANA zone such as Europe/Paris), beside the range before, of the same length. API keys belong to
      # a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token,
      # bound to none, reads every workspace with what its scopes allow there.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :days
      # @option params [String] :time_zone
      #
      # @example
      #   client.overview.report_export(time_zone: "timeZone")
      #
      # @return [String]
      def report_export(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["days"] = params[:days] if params.key?(:days)
        query_params["timeZone"] = params[:time_zone] if params.key?(:time_zone)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/me/report/export",
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
          401 => Peal::Types::UnauthenticatedEncoded
        }
        error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
        raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
      end
    end
  end
end
