# frozen_string_literal: true

module Peal
  module Channels
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.
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
      #   client.channels.list(workspace_id: "workspaceId")
      #
      # @return [Array[Peal::Types::Channel]]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          Peal::Internal::Types::Utils.coerce(Internal::Types::Array[Peal::Types::Channel], (response.body.to_s.empty? ? nil : JSON.parse(response.body, symbolize_names: true)))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the workspace's channels a page at a time, oldest first: 50 unless `limit` (at most 100) says otherwise.
      # Every filter given must hold: `platform`, `status` (`active`, `refreshNeeded` or `disabled`) and `q`, text the
      # channel's handle, the name its platform shows or the name the workspace gave it holds, whatever its case.
      # `counts` says how many channels the platform and text match in each status, whatever the status asked for. Pass
      # the page's `nextCursor` as `cursor`, with the same filters, for the next page; a cursor no page gave is a bad
      # request. Needs channel:read.
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
      # @option params [Peal::Types::Platform, nil] :platform
      # @option params [String, nil] :q
      # @option params [Peal::Types::ChannelStatusName, nil] :status
      #
      # @example
      #   client.channels.find(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::ChannelPage]
      def find(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["platform"] = params[:platform] if params.key?(:platform)
        query_params["q"] = params[:q] if params.key?(:q)
        query_params["status"] = params[:status] if params.key?(:status)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/search",
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
          (response.body.to_s.empty? ? nil : Peal::Types::ChannelPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the
      # server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs
      # channel:connect.
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
      #   client.channels.platforms(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::ConnectablePlatforms]
      def platforms(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/platforms",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::ConnectablePlatforms.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes
      # next. For Instagram, `connection` picks Instagram Login (the professional account itself, no Facebook Page
      # needed) or Facebook Login (the accounts linked to the caller's Pages); without it, the server's preferred way.
      # The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server
      # that bills, a workspace whose plan allows no more channels gets PlanLimitReached, and an X account needs a
      # payment method on per-account pricing, as X's calls are billed at X's rates (UsageAllowanceReached `xApi`,
      # `paymentMethodRequired` without one). Needs channel:connect.
      #
      # @param request_options [Hash]
      # @param params [Peal::Channels::Types::ConnectChannel]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [Peal::Types::Platform] :platform
      #
      # @example
      #   client.channels.connect(
      #     workspace_id: "workspaceId",
      #     platform: "x"
      #   )
      #
      # @return [Peal::Types::Authorization]
      def connect(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Channels::Types::ConnectChannel.new(params).to_h
        non_body_param_names = %w[workspaceId platform]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/connect/#{URI.encode_uri_component(params[:platform].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::Authorization.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the
      # channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook
      # user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the
      # connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached), and, on a
      # server that bills, an X account a payment method (UsageAllowanceReached `xApi`). Needs channel:connect.
      #
      # @param request_options [Hash]
      # @param params [Peal::Channels::Types::ConnectCallback]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [Peal::Types::Platform] :platform
      #
      # @example
      #   client.channels.complete_connect(
      #     workspace_id: "workspaceId",
      #     platform: "x",
      #     state: "state"
      #   )
      #
      # @return [Peal::Types::ConnectOutcome]
      def complete_connect(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Channels::Types::ConnectCallback.new(params).to_h
        non_body_param_names = %w[workspaceId platform]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/connect/#{URI.encode_uri_component(params[:platform].to_s)}/callback",
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
          (response.body.to_s.empty? ? nil : Peal::Types::ConnectOutcome.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the
      # workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them:
      # otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who
      # completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed
      # before connecting any can be made again. Needs channel:connect.
      #
      # @param request_options [Hash]
      # @param params [Peal::Channels::Types::ChooseAccounts]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [Peal::Types::Platform] :platform
      #
      # @example
      #   client.channels.choose_accounts(
      #     workspace_id: "workspaceId",
      #     platform: "x",
      #     account_ids: ["accountIds"],
      #     selection: "selection"
      #   )
      #
      # @return [Array[Peal::Types::Channel]]
      def choose_accounts(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Channels::Types::ChooseAccounts.new(params).to_h
        non_body_param_names = %w[workspaceId platform]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/connect/#{URI.encode_uri_component(params[:platform].to_s)}/accounts",
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
          Peal::Internal::Types::Utils.coerce(Internal::Types::Array[Peal::Types::Channel], (response.body.to_s.empty? ? nil : JSON.parse(response.body, symbolize_names: true)))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in
      # page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so
      # no plan limit refuses it. With `messages=true`, the sign-in also asks for the account's direct messages where
      # the platform asks for them apart: on Bluesky, the chat methods' permissions, which turning a channel's messages
      # on needs (`setChannelMessages` answers 409 `InboxActionUnavailable`, `reconnect`, until they are granted). A
      # reconnect of a Bluesky channel that granted them asks them again, so its messages stay readable. Needs
      # channel:connect.
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
      # @option params [Peal::Channels::Types::ReconnectChannelsRequestMessages, nil] :messages
      #
      # @example
      #   client.channels.reconnect(
      #     workspace_id: "workspaceId",
      #     channel_id: "channelId"
      #   )
      #
      # @return [Peal::Types::Authorization]
      def reconnect(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["messages"] = params[:messages] if params.key?(:messages)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/#{URI.encode_uri_component(params[:channel_id].to_s)}/reconnect",
          query: query_params,
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
          (response.body.to_s.empty? ? nil : Peal::Types::Authorization.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing
      # more is posted on it. Needs channel:disconnect.
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
      #
      # @example
      #   client.channels.disconnect(
      #     workspace_id: "workspaceId",
      #     channel_id: "channelId"
      #   )
      #
      # @return [untyped]
      def disconnect(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/#{URI.encode_uri_component(params[:channel_id].to_s)}",
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

      # Gives the channel the name the workspace calls it by (`label`, 60 characters at most, on one line), or takes it
      # back with null. The name is Peal's own: it is shown beside the handle and name the platform gives the account,
      # which stay, and is sent to no platform. Needs channel:connect.
      #
      # @param request_options [Hash]
      # @param params [Peal::Channels::Types::ChannelUpdate]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :channel_id
      #
      # @example
      #   client.channels.update(
      #     workspace_id: "workspaceId",
      #     channel_id: "channelId",
      #     label: nil
      #   )
      #
      # @return [Peal::Types::Channel]
      def update(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Channels::Types::ChannelUpdate.new(params).to_h
        non_body_param_names = %w[workspaceId channelId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/#{URI.encode_uri_component(params[:channel_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::Channel.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Turns the channel off: nothing goes out on it until it is turned back on. It keeps its connection, its history,
      # its name and its place in the plan's count, and no reconnect reminder is sent meanwhile. A post that reaches its
      # time while the channel is off fails on that channel (`channelDisabled`) and goes out on its others; it is not
      # sent later. A channel already off stays as it is. Needs channel:connect.
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
      #
      # @example
      #   client.channels.disable(
      #     workspace_id: "workspaceId",
      #     channel_id: "channelId"
      #   )
      #
      # @return [Peal::Types::Channel]
      def disable(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/#{URI.encode_uri_component(params[:channel_id].to_s)}/disable",
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
          (response.body.to_s.empty? ? nil : Peal::Types::Channel.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Turns a channel back on. It posts again at once, or has the status `refreshNeeded` when its token stopped
      # working or ran out while it was off: reconnect the account then. A channel that is on stays as it is. Needs
      # channel:connect.
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
      #
      # @example
      #   client.channels.enable(
      #     workspace_id: "workspaceId",
      #     channel_id: "channelId"
      #   )
      #
      # @return [Peal::Types::Channel]
      def enable(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/#{URI.encode_uri_component(params[:channel_id].to_s)}/enable",
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
          (response.body.to_s.empty? ? nil : Peal::Types::Channel.load(response.body))
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
