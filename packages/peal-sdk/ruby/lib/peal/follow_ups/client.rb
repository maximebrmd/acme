# frozen_string_literal: true

module Peal
  module FollowUps
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's follow-up rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise,
      # those of the post `postId` or with `status` alone when given, each with what its channels can carry and its
      # latest 20 follow-ups. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
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
      # @option params [String, nil] :post_id
      # @option params [Peal::Types::FollowUpRuleStatus, nil] :status
      #
      # @example
      #   client.follow_ups.list(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::FollowUpRulePage]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["postId"] = params[:post_id] if params.key?(:post_id)
        query_params["status"] = params[:status] if params.key?(:status)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/follow-ups",
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
          (response.body.to_s.empty? ? nil : Peal::Types::FollowUpRulePage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Starts a rule on a post (`postId`) or on every post a channel publishes from now on (`channelId`), exactly one
      # of them, that waits for `likes` likes (1 to 1,000,000) and then publishes `comment`, reposts (`repost`), or
      # both. A rule acts on the workspace's own posts only, from the channel's own account: once a post it acts on has
      # `likes` likes on a channel, as analytics last counted them (hourly for two days, then daily: a rule never asks a
      # platform for more, nor makes a paid read happen), it publishes its `comment` under the post, as the account's
      # own reply after the post's last part, and reposts it when `repost` is set, once each, within 7 days of the post
      # going live there. A post is followed up once of each kind whatever rules act on it, and a channel carries 10
      # follow-ups a UTC day at most: those past it wait for the next day, within their window. Comments go out on
      # Bluesky, Mastodon and X (a post X bills, and only where the server sends X threads), reposts on Bluesky (a
      # channel connected before Peal asked for it must be connected again) and Mastodon; LinkedIn's terms forbid both,
      # and elsewhere `channels` says why not. Nothing likes, follows or messages anyone. It acts as whoever started it,
      # with what they may do then: where the approval policy holds their posts it waits for a member who approves posts
      # to approve it, and it ends when they can no longer publish. What each did is in `followUps`. A post that already
      # went out is armed at once, while its window lasts. It is refused when no channel it acts on can carry what it
      # asks, or when its comment is longer than a channel that could carry it takes (FollowUpNotPossible, with each
      # channel's reasons). A post or a channel has one rule going on at a time (FollowUpRuleTaken), and a workspace 100
      # active or paused. It publishes again, in public, without anyone being asked each time. Needs post:schedule, or
      # post:create where posts wait for an approval; never staff acting as a member.
      #
      # @param request_options [Hash]
      # @param params [Peal::FollowUps::Types::NewFollowUpRule]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.follow_ups.create(
      #     workspace_id: "workspaceId",
      #     likes: 1
      #   )
      #
      # @return [Peal::Types::FollowUpRule]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::FollowUps::Types::NewFollowUpRule.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/follow-ups",
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
          (response.body.to_s.empty? ? nil : Peal::Types::FollowUpRule.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers with a rule of the workspace, what its channels can carry and its latest 20 follow-ups. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :rule_id
      #
      # @example
      #   client.follow_ups.get(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [Peal::Types::FollowUpRule]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/follow-ups/#{URI.encode_uri_component(params[:rule_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::FollowUpRule.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Stops a rule: it ends `stopped`, what it armed and did not send is given up, and what it sent stays on the
      # platforms. Stopping an ended rule changes nothing. Needs post:schedule, or to be the rule's starter acting as
      # they started it.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :rule_id
      #
      # @example
      #   client.follow_ups.delete(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [untyped]
      def delete(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/follow-ups/#{URI.encode_uri_component(params[:rule_id].to_s)}",
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

      # Changes a rule's `likes`, its `comment` (null takes it away) or whether it reposts, or pauses it (`paused` true)
      # or sets it going again (false); what it leaves out stays. A follow-up that went out stays as it is; one armed
      # sends what the rule says when it goes. Where the approval policy holds the posts of whoever changes what the
      # rule sends, it waits for an approval again. A paused rule sends nothing, and what it armed expires with its
      # window. An ended rule changes no more (FollowUpRuleEnded). Needs post:schedule, or to be the rule's starter
      # acting as they started it: in the web app, through the same application or with the same API key.
      #
      # @param request_options [Hash]
      # @param params [Peal::FollowUps::Types::FollowUpRuleChange]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :rule_id
      #
      # @example
      #   client.follow_ups.update(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [Peal::Types::FollowUpRule]
      def update(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::FollowUps::Types::FollowUpRuleChange.new(params).to_h
        non_body_param_names = %w[workspaceId ruleId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/follow-ups/#{URI.encode_uri_component(params[:rule_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::FollowUpRule.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Approves what a rule sends, for a rule whose starter's posts wait for an approval: it then acts as it is. A rule
      # approved, or that needs no approval, is answered as it is. Needs post:approve, in person: an API key or an
      # application never approves.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :rule_id
      #
      # @example
      #   client.follow_ups.approve(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [Peal::Types::FollowUpRule]
      def approve(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/follow-ups/#{URI.encode_uri_component(params[:rule_id].to_s)}/approve",
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
          (response.body.to_s.empty? ? nil : Peal::Types::FollowUpRule.load(response.body))
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
