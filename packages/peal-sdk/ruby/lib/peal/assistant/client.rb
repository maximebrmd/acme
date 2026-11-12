# frozen_string_literal: true

module Peal
  module Assistant
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Tells whether the server has a language model, so clients show the assistant or hide it, whether it has an image
      # model (`images`), and how many requests the workspace has left today. Needs assistant:use.
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
      #   client.assistant.status(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::AssistantStatus]
      def status(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::AssistantStatus.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Asks the language model to rewrite, shorten or translate a post's text, to suggest hashtags for it, or to write
      # a first post from a subject (`write`), and answers once the whole suggestion is checked. The text is sent to the
      # model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's
      # provider could not be reached. Needs assistant:use.
      #
      # @param request_options [Hash]
      # @param params [Peal::Assistant::Types::SuggestionRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.assistant.suggest(
      #     workspace_id: "workspaceId",
      #     text: "text"
      #   )
      #
      # @return [Peal::Types::Suggestion]
      def suggest(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Assistant::Types::SuggestionRequest.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/suggestions",
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
          (response.body.to_s.empty? ? nil : Peal::Types::Suggestion.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Asks the server's image model for one image from the prompt, in the aspect asked for, and answers with it as a
      # new file of the media library, ready to attach, marked `aiGenerated` and without a description. The prompt is
      # sent to the image provider the server's operator chose; neither it nor the image is logged. An image costs the
      # status's `images.requestCost` of the workspace's daily requests, given back only when the provider could not be
      # reached, and takes room in the plan's media storage, which must hold the largest image before anything is spent.
      # The file is stored as the provider gave it. Peal sets no platform's AI label on its own: set it in the post's
      # options (YouTube `containsSyntheticMedia`, TikTok `aiGenerated`, X `madeWithAi`). Needs assistant:use and
      # media:upload. Off unless the server has an image model.
      #
      # @param request_options [Hash]
      # @param params [Peal::Assistant::Types::ImageRequest]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.assistant.generate_image(
      #     workspace_id: "workspaceId",
      #     aspect: "square",
      #     prompt: "prompt"
      #   )
      #
      # @return [Peal::Types::Media]
      def generate_image(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Assistant::Types::ImageRequest.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/images",
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
          (response.body.to_s.empty? ? nil : Peal::Types::Media.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded,
            402 => Peal::Types::PlanLimitReachedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end
    end
  end
end
