# frozen_string_literal: true

module Peal
  module PartnerUsage
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Answers what the partner account uses across the workspaces it holds, from `from` to `to` (UTC days, both
      # included, at most 92; by default the 30 days that end today), and per workspace. `current` is what it holds now:
      # the workspaces it owns and the channels connected across them and its home workspace, which its plan's channel
      # limit counts. Each day gives the workspaces it owned and the channels connected across them as the daily count
      # found them at 23:41 UTC (null for a day without a count), and the posts that went out in the workspaces that
      # still exist. `workspaces` is a page of its workspaces with each one's external id, the channels it connected
      # itself now, and over the period its channel-days, posts by platform, requests to the writing assistant, latest
      # media storage and, for each calendar month the period touches, posts on platforms that bill the server per post:
      # newest first, 50 a page unless `limit` (at most 100) says otherwise, in the order and with the cursor of the
      # list of the partner's workspaces (pass `next` as `before`; anything else is refused, 400); the home workspace
      # comes first, on the first page only, one more than asked. `current`, `days` and `totals`, which cover the whole
      # account, come with the first page only, and are null on the pages after it, which read their own workspaces
      # alone. A workspace offboarded during the period is no longer listed, and its posts leave the sums, as its counts
      # were erased with it; the daily `workspaces` and `channels` still count it for the days it existed. Kept 400
      # days. Counts only: nothing here is priced or limits anything. On a server that does not bill, `plan` and
      # `allowances` are null. Needs the scope workspaces:read. Takes a partner key (`Authorization: Bearer
      # peal_partner_…`): any other credential answers 403.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :before
      # @option params [String, nil] :from
      # @option params [String, nil] :limit
      # @option params [String, nil] :to
      #
      # @example
      #   client.partner_usage.get
      #
      # @return [Peal::Types::PartnerUsageReport]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["before"] = params[:before] if params.key?(:before)
        query_params["from"] = params[:from] if params.key?(:from)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["to"] = params[:to] if params.key?(:to)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/partner/usage",
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
          (response.body.to_s.empty? ? nil : Peal::Types::PartnerUsageReport.load(response.body))
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
