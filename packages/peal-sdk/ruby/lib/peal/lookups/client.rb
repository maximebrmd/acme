# frozen_string_literal: true

module Peal
  module Lookups
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the lookups the channel has: what its platform tells about the account that a post's options refer to,
      # such as the categories a YouTube video can be filed under or the boards a Pinterest Pin can be saved to. Each
      # says the input it takes and the options it fills. Empty for a platform without lookups. Needs channel:read.
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
      #   client.lookups.list(
      #     workspace_id: "workspaceId",
      #     channel_id: "channelId"
      #   )
      #
      # @return [Array[Peal::Types::LookupDescription]]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/#{URI.encode_uri_component(params[:channel_id].to_s)}/lookups",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          Peal::Internal::Types::Utils.coerce(Internal::Types::Array[Peal::Types::LookupDescription], (response.body.to_s.empty? ? nil : JSON.parse(response.body, symbolize_names: true)))
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

      # Runs one of the channel's lookups: asks the platform now, with the channel's token, and answers a page of items
      # tagged by the lookup's name. It changes nothing, on Peal or on the platform. A paged lookup names the next page
      # in `nextCursor`, to send back as `cursor`. A name the channel's platform does not have is LookupNotFound; an
      # input the lookup does not take, LookupInputInvalid; a channel turned off or to reconnect, ChannelCannotPost; a
      # platform that did not answer, PlatformUnreachable, and one that asked to slow down, PlatformRateLimited. Needs
      # channel:read.
      #
      # @param request_options [Hash]
      # @param params [Peal::Lookups::Types::LookupInput]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :channel_id
      # @option params [String] :name
      #
      # @example
      #   client.lookups.run(
      #     workspace_id: "workspaceId",
      #     channel_id: "channelId",
      #     name: "name"
      #   )
      #
      # @return [Peal::Types::LookupResult]
      def run(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Lookups::Types::LookupInput.new(params).to_h
        non_body_param_names = %w[workspaceId channelId name]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/channels/#{URI.encode_uri_component(params[:channel_id].to_s)}/lookups/#{URI.encode_uri_component(params[:name].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::LookupResult.load(response.body))
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
