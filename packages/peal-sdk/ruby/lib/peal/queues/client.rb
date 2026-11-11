# frozen_string_literal: true

module Peal
  module Queues
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's queues, the default first, then by name, each with its slots, its channels and those of
      # them disconnected since (`unavailableChannelIds`). Needs post:read and channel:read.
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
      #   client.queues.list(workspace_id: "workspaceId")
      #
      # @return [Array[Peal::Types::Queue]]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/queues",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          Peal::Internal::Types::Utils.coerce(Internal::Types::Array[Peal::Types::Queue], (response.body.to_s.empty? ? nil : JSON.parse(response.body, symbolize_names: true)))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Saves a queue. A slot is a weekday and a time of day (`HH:mm`) in the queue's IANA time zone, each pair once,
      # 100 at most: a time daylight saving skips moves to the moment the clocks jump, and a time it repeats happens
      # once. A queue may be for some of the workspace's channels (`channelIds`, connected ones, 50 at most) and one
      # channel set (`channelSetId`), which a post added to it goes to when it names none. Its name is one no other
      # queue of the workspace has, whatever its case. `isDefault` makes it the workspace's default queue, the one a
      # post added to no queue in particular takes, instead of the one that was. The first queue of a workspace is its
      # default. A workspace keeps 20 queues at most. Needs post:update and channel:read.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::QueueDetails]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.queues.create(
      #     workspace_id: "workspaceId",
      #     name: "name",
      #     slots: [{
      #       day: "monday",
      #       time: "time"
      #     }],
      #     time_zone: "timeZone"
      #   )
      #
      # @return [Peal::Types::Queue]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/queues",
          body: Peal::Types::QueueDetails.new(body_params).to_h,
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
          (response.body.to_s.empty? ? nil : Peal::Types::Queue.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Answers with a queue of the workspace. Needs post:read and channel:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :queue_id
      #
      # @example
      #   client.queues.get(
      #     workspace_id: "workspaceId",
      #     queue_id: "queueId"
      #   )
      #
      # @return [Peal::Types::Queue]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/queues/#{URI.encode_uri_component(params[:queue_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Queue.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Replaces a queue's name, zone, slots and channels: every channel must be connected now, so this is also how a
      # disconnected one is taken out. A slot is a weekday and a time of day (`HH:mm`) in the queue's IANA time zone,
      # each pair once, 100 at most: a time daylight saving skips moves to the moment the clocks jump, and a time it
      # repeats happens once. A queue may be for some of the workspace's channels (`channelIds`, connected ones, 50 at
      # most) and one channel set (`channelSetId`), which a post added to it goes to when it names none. Its name is one
      # no other queue of the workspace has, whatever its case. `isDefault` makes it the workspace's default queue, the
      # one a post added to no queue in particular takes, instead of the one that was. Posts the queue placed keep their
      # times: a slot that changed frees nothing and moves nothing. Saving the default with `isDefault` false, or
      # without `isDefault`, leaves the workspace without one, and a post then sent to the default queue is refused
      # (QueueNotFound): send `isDefault` true to keep it the default. Needs post:update and channel:read.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::QueueDetails]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :queue_id
      #
      # @example
      #   client.queues.update(
      #     workspace_id: "workspaceId",
      #     queue_id: "queueId",
      #     name: "name",
      #     slots: [{
      #       day: "monday",
      #       time: "time"
      #     }],
      #     time_zone: "timeZone"
      #   )
      #
      # @return [Peal::Types::Queue]
      def update(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id queue_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PUT",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/queues/#{URI.encode_uri_component(params[:queue_id].to_s)}",
          body: Peal::Types::QueueDetails.new(body_params).to_h,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Queue.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Deletes a queue. The posts it placed stay scheduled at their times, and no longer name it (`queueId` null).
      # Deleting the default leaves the workspace without one until another is made default. Needs post:update.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :queue_id
      #
      # @example
      #   client.queues.delete(
      #     workspace_id: "workspaceId",
      #     queue_id: "queueId"
      #   )
      #
      # @return [untyped]
      def delete(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/queues/#{URI.encode_uri_component(params[:queue_id].to_s)}",
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

      # Lists the queue's next `count` slots after now (10 unless given, 50 at most), each with the post that holds it,
      # or null, and `nextFree`, the slot a post added now would take, which may come after them; null with `noRoom`
      # when there is none: the queue has no slot (`noSlots`), or every slot of the next 366 days is taken (`full`). A
      # slot is taken while a post the queue placed is scheduled, awaiting approval or publishing at exactly that
      # instant. The preview holds nothing: the slot is decided when the post is added. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :queue_id
      # @option params [String, nil] :count
      #
      # @example
      #   client.queues.slots(
      #     workspace_id: "workspaceId",
      #     queue_id: "queueId"
      #   )
      #
      # @return [Peal::Types::QueuePreview]
      def slots(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["count"] = params[:count] if params.key?(:count)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/queues/#{URI.encode_uri_component(params[:queue_id].to_s)}/slots",
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
          (response.body.to_s.empty? ? nil : Peal::Types::QueuePreview.load(response.body))
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
