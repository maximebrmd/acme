# frozen_string_literal: true

module Peal
  module InboxRules
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's comment rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those
      # with `status` alone when given, each with what its channels can carry and the latest 20 comments it matched.
      # Needs engagement:read.
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
      # @option params [Peal::Types::CommentRuleStatus, nil] :status
      #
      # @example
      #   client.inbox_rules.list_comment_rules(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::CommentRulePage]
      def list_comment_rules(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["status"] = params[:status] if params.key?(:status)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/inbox/rules",
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
          (response.body.to_s.empty? ? nil : Peal::Types::CommentRulePage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Starts a rule on the comments of a post that went out (`postId`) or of every post of a channel (`channelId`),
      # exactly one of them, with 1 to 10 `keywords` and a `reply`. A rule answers, by itself and in public, as the
      # channel's account, a comment received after it started, under a post it answers on, that holds one of its
      # keywords as a word (whatever its case and accents): with its `reply`, once a comment and once a person, 25
      # replies a day at most, through the inbox's own replies (their journal, one reply a comment, each one of the
      # billing account's outbound messages). It answers on Mastodon, and on Facebook Pages and Instagram where the
      # server reads their comments; Bluesky's, X's, LinkedIn's and YouTube's rules forbid an app to answer by itself,
      # and `channels` says so. It never likes, follows or messages anyone privately. It acts as whoever started it,
      # with what they may do then: it ends when they can no longer answer comments. It is refused when no channel it
      # answers on can carry its reply (CommentRuleNotPossible, with each channel's reason). A workspace keeps 100 rules
      # active or paused. Needs engagement:reply; never staff acting as a member.
      #
      # @param request_options [Hash]
      # @param params [Peal::InboxRules::Types::NewCommentRule]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.inbox_rules.create_comment_rule(
      #     workspace_id: "workspaceId",
      #     keywords: ["keywords"],
      #     reply: "reply"
      #   )
      #
      # @return [Peal::Types::CommentRule]
      def create_comment_rule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::InboxRules::Types::NewCommentRule.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/inbox/rules",
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
          (response.body.to_s.empty? ? nil : Peal::Types::CommentRule.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers a comment rule of the workspace, what its channels can carry and what it matched. Needs engagement:read.
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
      #   client.inbox_rules.get_comment_rule(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [Peal::Types::CommentRule]
      def get_comment_rule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/inbox/rules/#{URI.encode_uri_component(params[:rule_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::CommentRule.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Stops a rule: it answers nothing more; the replies it sent stay, and the inbox withdraws one as any other. Needs
      # engagement:reply.
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
      #   client.inbox_rules.delete_comment_rule(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [untyped]
      def delete_comment_rule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/inbox/rules/#{URI.encode_uri_component(params[:rule_id].to_s)}",
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

      # Changes a rule's keywords or reply, or pauses it (`paused` true) or sets it going again (false); what it leaves
      # out stays. A paused rule looks at nothing, and answers no comment received while it was paused. An ended rule
      # changes no more (CommentRuleEnded). Needs engagement:reply.
      #
      # @param request_options [Hash]
      # @param params [Peal::InboxRules::Types::CommentRuleChange]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :rule_id
      #
      # @example
      #   client.inbox_rules.update_comment_rule(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [Peal::Types::CommentRule]
      def update_comment_rule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::InboxRules::Types::CommentRuleChange.new(params).to_h
        non_body_param_names = %w[workspaceId ruleId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/inbox/rules/#{URI.encode_uri_component(params[:rule_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::CommentRule.load(response.body))
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
