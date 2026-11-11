# frozen_string_literal: true

module Peal
  module Webhooks
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's webhook endpoints, oldest first. Needs webhook:read.
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
      #   client.webhooks.list(workspace_id: "workspaceId")
      #
      # @return [Array[Peal::Types::WebhookEndpoint]]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          Peal::Internal::Types::Utils.coerce(Internal::Types::Array[Peal::Types::WebhookEndpoint], (response.body.to_s.empty? ? nil : JSON.parse(response.body, symbolize_names: true)))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Adds a webhook endpoint to the workspace, and answers with its signing secret, which is not shown again. Its
      # address must be HTTPS on the default port, on a public host, without credentials; Peal follows no redirect from
      # it. A workspace has 10 endpoints at most, whatever its plan. With `scope` `partner`, in the home workspace of a
      # partner account, the endpoint also hears what happens in every workspace the partner owns, each event naming its
      # workspace and carrying the partner's own id for it (`workspaceExternalId`); any other workspace answers 404
      # `PartnerNotFound`. `channelIds` (50 at most) narrows it to the events about those channels: an event of one
      # channel when it is listed, an event of a whole post when one of its channels is, and an event about no channel
      # (a file, a boost) whatever it lists; leave such types out of `eventTypes` when they are not wanted.
      # `workspaceIds` (200 at most), on a `partner` endpoint only, narrows it to those workspaces, the home workspace
      # only if listed. Ids are checked for their shape only: one that names nothing matches nothing, and a filter stays
      # as saved when what it names is gone. Filters apply when each event happens. `headers` (5 at most) go with every
      # delivery beside Peal's own, which they never replace, for a gateway in front of the receiver that wants a token:
      # a name is an HTTP token, once whatever its case, neither `host`, `content-type`, `content-length`, `user-agent`,
      # `cookie`, a connection's own nor any `webhook-` name; a value is visible ASCII on one line, 1024 characters at
      # most. Values are write-only: the endpoint shows their names (`headerNames`), never them. The signature does not
      # cover them. Needs webhook:manage.
      #
      # @param request_options [Hash]
      # @param params [Peal::Webhooks::Types::NewWebhookEndpoint]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.webhooks.create(
      #     workspace_id: "workspaceId",
      #     event_types: ["post.scheduled"],
      #     url: "url"
      #   )
      #
      # @return [Peal::Types::WebhookEndpointSecret]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Webhooks::Types::NewWebhookEndpoint.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks",
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
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookEndpointSecret.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the workspace's deliveries across its endpoints, newest first, 30 a page unless `limit` (at most 100) says
      # otherwise, filtered by `status`, `endpointId`, `eventType`, and when they were made: `since` (included) and
      # `until` (excluded). The deliveries of a `partner` endpoint include those of the partner's other workspaces, each
      # naming its workspace (`workspaceId`, `workspaceExternalId`). A delivery that failed for good (`failed`) stays 30
      # days, with the receiver's last answer: send it again with `POST …/webhooks/deliveries/redeliver`. Pass the
      # page's `nextCursor` as `cursor` for the next one. Needs webhook:read.
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
      # @option params [Peal::Types::WebhookEventType, nil] :event_type
      # @option params [Peal::Types::WebhookDeliveryStatus, nil] :status
      # @option params [String, nil] :endpoint_id
      # @option params [String, nil] :since
      # @option params [String, nil] :until_
      #
      # @example
      #   client.webhooks.search_deliveries(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::WebhookDeliveryPage]
      def search_deliveries(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["eventType"] = params[:event_type] if params.key?(:event_type)
        query_params["status"] = params[:status] if params.key?(:status)
        query_params["endpointId"] = params[:endpoint_id] if params.key?(:endpoint_id)
        query_params["since"] = params[:since] if params.key?(:since)
        query_params["until"] = params[:until_] if params.key?(:until_)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/deliveries",
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
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookDeliveryPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sends many deliveries again, 100 a call at most: those named by `deliveryIds`, or the failed deliveries of the
      # endpoint `endpointId` (made from `since`, before `until`, of `eventType`, each left out for any), oldest first,
      # the last of each event only. Each goes to its own endpoint whatever the endpoint's filters are now, as a new
      # delivery of the same event: the same `webhook-id` and body, signed anew. A delivery is skipped when its endpoint
      # is off, when it is not the workspace's, and when its event was sent again since and that delivery is pending or
      # went through, so calling again after a partial run sends nothing twice; `remaining` says how many more failed
      # deliveries the selection holds. The new deliveries of an endpoint start a quarter of a second apart. A workspace
      # sends 1000 deliveries again this way an hour, apart from the test events and single sends: a call that would
      # pass it sends nothing (429 `TooManyWebhookSends`). Needs webhook:manage.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::WebhookRedeliveryRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.webhooks.redeliver_many(
      #     workspace_id: "workspaceId",
      #     delivery_ids: ["deliveryIds"]
      #   )
      #
      # @return [Peal::Types::WebhookBulkRedelivery]
      def redeliver_many(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/deliveries/redeliver",
          body: Peal::Types::WebhookRedeliveryRequest.new(body_params).to_h,
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
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookBulkRedelivery.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Shows one of the workspace's webhook endpoints. Needs webhook:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :endpoint_id
      #
      # @example
      #   client.webhooks.get(
      #     workspace_id: "workspaceId",
      #     endpoint_id: "endpointId"
      #   )
      #
      # @return [Peal::Types::WebhookEndpoint]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/#{URI.encode_uri_component(params[:endpoint_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookEndpoint.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Deletes an endpoint, its secret and its delivery log: nothing more is sent to it. Needs webhook:manage.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :endpoint_id
      #
      # @example
      #   client.webhooks.delete(
      #     workspace_id: "workspaceId",
      #     endpoint_id: "endpointId"
      #   )
      #
      # @return [untyped]
      def delete(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/#{URI.encode_uri_component(params[:endpoint_id].to_s)}",
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

      # Changes an endpoint's address, description, events, filters or headers, or turns it off or back on: what is left
      # out stays as it is, and an empty filter hears everything again; `workspaceIds` is for an endpoint of the
      # `partner` scope only (422 `WebhookFilterRefused`). `headers` replaces every header it had, `[]` removing them
      # all: a header given without `value` keeps the value it has under that name, as none is ever shown, and one it
      # does not have needs a value. Filters apply to the events that happen after the change. Turned off, it is sent
      # nothing, its pending deliveries fail, and events that happen meanwhile are not kept for it. Turning it back on
      # forgets the failures that turned it off. Needs webhook:manage.
      #
      # @param request_options [Hash]
      # @param params [Peal::Webhooks::Types::WebhookEndpointChange]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :endpoint_id
      #
      # @example
      #   client.webhooks.update(
      #     workspace_id: "workspaceId",
      #     endpoint_id: "endpointId"
      #   )
      #
      # @return [Peal::Types::WebhookEndpoint]
      def update(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Webhooks::Types::WebhookEndpointChange.new(params).to_h
        non_body_param_names = %w[workspaceId endpointId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/#{URI.encode_uri_component(params[:endpoint_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookEndpoint.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Replaces an endpoint's signing secret, and answers with the new one, which is not shown again. For 24 hours each
      # delivery carries two signatures, one per secret, so the receiver changes its own without missing any; the old
      # one then signs nothing more. Needs webhook:manage.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :endpoint_id
      #
      # @example
      #   client.webhooks.rotate_secret(
      #     workspace_id: "workspaceId",
      #     endpoint_id: "endpointId"
      #   )
      #
      # @return [Peal::Types::WebhookEndpointSecret]
      def rotate_secret(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/secret",
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
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookEndpointSecret.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sends the endpoint a `webhook.test` event, or, with `eventType`, a sample of that type: its real shape, with ids
      # that name nothing, the workspace's own id and `sample: true`, which the receiver must never act on. Either goes
      # whatever the endpoint subscribes to or filters. It answers with the delivery, still pending: read the endpoint's
      # deliveries to see how it ended. A workspace sends 30 test events and deliveries again an hour at most (429
      # `TooManyWebhookSends`). Needs webhook:manage.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :endpoint_id
      # @option params [Peal::Types::SubscribableWebhookEventType, nil] :event_type
      #
      # @example
      #   client.webhooks.send_test(
      #     workspace_id: "workspaceId",
      #     endpoint_id: "endpointId"
      #   )
      #
      # @return [Peal::Types::WebhookDelivery]
      def send_test(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["eventType"] = params[:event_type] if params.key?(:event_type)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/test",
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
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookDelivery.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the endpoint's deliveries, newest first, of a `status` and an `eventType` when given, 30 a page unless
      # `limit` (at most 100) says otherwise: each one's status, the receiver's last answer, how many attempts were made
      # and when the next one is. Pass the page's `nextCursor` as `cursor` for the next one. A delivery is kept 30 days.
      # Needs webhook:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :endpoint_id
      # @option params [String, nil] :cursor
      # @option params [String, nil] :limit
      # @option params [Peal::Types::WebhookEventType, nil] :event_type
      # @option params [Peal::Types::WebhookDeliveryStatus, nil] :status
      #
      # @example
      #   client.webhooks.list_deliveries(
      #     workspace_id: "workspaceId",
      #     endpoint_id: "endpointId"
      #   )
      #
      # @return [Peal::Types::WebhookDeliveryPage]
      def list_deliveries(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["eventType"] = params[:event_type] if params.key?(:event_type)
        query_params["status"] = params[:status] if params.key?(:status)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/deliveries",
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
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookDeliveryPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sends the delivery's event to the endpoint again, as a new delivery of the same event: the receiver gets the
      # same `webhook-id` and body, with a new timestamp and signature. A workspace sends 30 test events and deliveries
      # again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :endpoint_id
      # @option params [String] :delivery_id
      #
      # @example
      #   client.webhooks.redeliver(
      #     workspace_id: "workspaceId",
      #     endpoint_id: "endpointId",
      #     delivery_id: "deliveryId"
      #   )
      #
      # @return [Peal::Types::WebhookDelivery]
      def redeliver(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/webhooks/#{URI.encode_uri_component(params[:endpoint_id].to_s)}/deliveries/#{URI.encode_uri_component(params[:delivery_id].to_s)}/redeliver",
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
          (response.body.to_s.empty? ? nil : Peal::Types::WebhookDelivery.load(response.body))
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
