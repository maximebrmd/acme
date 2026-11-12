# frozen_string_literal: true

module Peal
  module Recycling
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's recycling rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise,
      # those with `status` alone when given, each with its next 3 posts to come. Pass the page's `nextCursor` as
      # `cursor` for the next one. Needs post:read.
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
      # @option params [Peal::Types::RecyclingStatus, nil] :status
      #
      # @example
      #   client.recycling.list(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::RecyclingRulePage]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["status"] = params[:status] if params.key?(:status)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/recycling",
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
          (response.body.to_s.empty? ? nil : Peal::Types::RecyclingRulePage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Starts a rule that repeats a post that is scheduled, publishing or went out (deleted from a platform since or
      # not): `every` 1 to 365 days, 1 to 52 weeks or 1 to 12 months, until `count` posts in all (2 to 100, the source
      # counted) or until the day `until`, and never more than 100; with up to 10 text `variants`, each checked as the
      # source saying it would be, and optionally on a queue. Each post a rule makes is a new post, copied from the
      # source with what the workspace still has (its channels still connected, its media, the options on them, its
      # tags; never a signature or a default added since), and sent as any post is: the same checks, the approval
      # policy, the month's room in the plan, its own job, outcome and notices. It says the source's text, then each
      # variant in turn, then the source's again. The next post is made once the latest one's time has passed, one
      # interval after the one before at the same wall-clock time in the source's zone (a month shorter than the day
      # takes its last day), or on the queue's first free slot from then; a time missed while nothing ran is skipped,
      # never made up for. Each acts as whoever started the rule, with what they may do when it is made: a member
      # removed, a key revoked or an application whose grant no longer publishes ends it. A post has one rule going on
      # at a time, and a workspace 100 active or paused. It publishes again, in public, without anyone being asked each
      # time, unless the approval policy holds the starter's posts: then each waits for an approval. Needs
      # post:schedule, or post:create where posts wait for an approval; never staff acting as a member.
      #
      # @param request_options [Hash]
      # @param params [Peal::Recycling::Types::NewRecyclingRule]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.recycling.create(
      #     workspace_id: "workspaceId",
      #     every: {
      #       count: 1,
      #       unit: "days"
      #     },
      #     post_id: "postId"
      #   )
      #
      # @return [Peal::Types::RecyclingRule]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Recycling::Types::NewRecyclingRule.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/recycling",
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
          (response.body.to_s.empty? ? nil : Peal::Types::RecyclingRule.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers with a rule of the workspace and its next 3 posts to come, each with the variant it will say. Needs
      # post:read.
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
      #   client.recycling.get(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [Peal::Types::RecyclingRule]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/recycling/#{URI.encode_uri_component(params[:rule_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::RecyclingRule.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Stops a rule: it makes no more posts and ends `stopped`; the posts it made stay as they are, scheduled ones
      # included. Stopping an ended rule changes nothing. Needs post:schedule, or to be the rule's starter.
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
      #   client.recycling.delete(
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
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/recycling/#{URI.encode_uri_component(params[:rule_id].to_s)}",
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

      # Changes a rule's variants, its `count` or `until` (null takes it away), or pauses it (`paused` true) or sets it
      # going again (false); what it leaves out stays. A post already made keeps what it says. An ended rule changes no
      # more (RecyclingRuleEnded): resume it. Needs post:schedule, or to be the rule's starter.
      #
      # @param request_options [Hash]
      # @param params [Peal::Recycling::Types::RecyclingRuleChange]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :rule_id
      #
      # @example
      #   client.recycling.update(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [Peal::Types::RecyclingRule]
      def update(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Recycling::Types::RecyclingRuleChange.new(params).to_h
        non_body_param_names = %w[workspaceId ruleId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/recycling/#{URI.encode_uri_component(params[:rule_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::RecyclingRule.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sets a paused rule going again, or one that ended for a reason that can be put right (`planLimit`,
      # `contentRejected`, `noChannels`, `queueFull`), with other `variants` if given: its next post is due at the first
      # due instant after now. Any other ended rule is RecyclingRuleEnded. Needs post:schedule, or to be the rule's
      # starter.
      #
      # @param request_options [Hash]
      # @param params [Peal::Recycling::Types::RecyclingResume]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :rule_id
      #
      # @example
      #   client.recycling.resume(
      #     workspace_id: "workspaceId",
      #     rule_id: "ruleId"
      #   )
      #
      # @return [Peal::Types::RecyclingRule]
      def resume(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Recycling::Types::RecyclingResume.new(params).to_h
        non_body_param_names = %w[workspaceId ruleId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/recycling/#{URI.encode_uri_component(params[:rule_id].to_s)}/resume",
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
          (response.body.to_s.empty? ? nil : Peal::Types::RecyclingRule.load(response.body))
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
