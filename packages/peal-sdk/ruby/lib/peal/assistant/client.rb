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

      # Tells whether the assistant writes for the workspace, so clients show it or hide it, and who writes (`source`:
      # the workspace's own text provider, the server's language model, or nobody), who makes the workspace's images
      # (`images.source`: the workspace's own provider, the server's image model, or nobody) and what one costs, and how
      # many requests the workspace has left today. Needs assistant:use.
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
      # model as data, never as instructions. When the workspace brought its own text provider (`source` `workspace` in
      # the status), the text goes there, with the workspace's key, and the request costs none of the workspace's daily
      # requests, on any plan, within a number of such requests a day (OwnTextLimitReached past it); if that provider
      # refuses, the answer is TextProviderRefused and the server's model is never asked instead. Otherwise each request
      # counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs
      # assistant:use.
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

      # Asks for one image from the prompt, in the aspect asked for, and answers with it as a new file of the media
      # library, ready to attach, marked `aiGenerated` and without a description. When the workspace brought its own
      # image provider, the prompt goes there, with the workspace's key, and the image costs none of the workspace's
      # daily requests, on any plan, a trial and the free plan included, within a number of such images a day
      # (OwnImageLimitReached past it); if that provider refuses, the answer is ImageProviderRefused and the server's
      # model is never asked instead. Otherwise the prompt goes to the image provider the server's operator chose, and
      # an image costs the status's `images.requestCost` of the workspace's daily requests, given back only when the
      # provider could not be reached. Neither the prompt nor the image is logged. Either way the image takes room in
      # the plan's media storage, which must hold the largest image before anything is asked. The file is stored as the
      # provider gave it. Peal sets no platform's AI label on its own: set it in the post's options (YouTube
      # `containsSyntheticMedia`, TikTok `aiGenerated`, X `madeWithAi`). Needs assistant:use and media:upload. Off
      # unless the workspace brought a provider or the server has an image model (`images.source`).
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

      # Reads the image provider the workspace brought, an endpoint that speaks the OpenAI images API (`POST
      # {baseUrl}/images/generations`), whose images then spend none of the workspace's daily assistant requests: its
      # address and model, never its key, or null. Needs assistant:configure.
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
      #   client.assistant.image_provider(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::ImageProviderSetting]
      def image_provider(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/image-provider",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::ImageProviderSetting.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sets the image provider the workspace brings, an endpoint that speaks the OpenAI images API (`POST
      # {baseUrl}/images/generations`), whose images then spend none of the workspace's daily assistant requests. The
      # workspace's image prompts then go to `baseUrl` with `apiKey` as a bearer token; the images still take room in
      # the plan's media storage. Peal keeps the key encrypted for this workspace and this address, never shows it
      # again, and never sends it to another address: `apiKey` may be left out to keep the stored one only while
      # `baseUrl` stays exactly the same (to change the model alone). The address must be public HTTPS; it is checked
      # now, and before every call. The provider is not called: the first image tells whether the settings work. Needs
      # assistant:configure.
      #
      # @param request_options [Hash]
      # @param params [Peal::Assistant::Types::ImageProviderChange]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.assistant.set_image_provider(
      #     workspace_id: "workspaceId",
      #     base_url: "baseUrl",
      #     model: "model"
      #   )
      #
      # @return [Peal::Types::ImageProvider]
      def set_image_provider(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Assistant::Types::ImageProviderChange.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PUT",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/image-provider",
          body: body,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::ImageProvider.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Removes the workspace's image provider and its key: images are made by the server's image model again, if it has
      # one, and cost the workspace's daily requests. Needs assistant:configure.
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
      #   client.assistant.remove_image_provider(workspace_id: "workspaceId")
      #
      # @return [untyped]
      def remove_image_provider(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/image-provider",
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

      # Reads the text provider the workspace brought, Anthropic's Messages API or an endpoint that speaks the OpenAI
      # chat completions API, whose suggestions then spend none of the workspace's daily assistant requests: the API it
      # speaks, its address and model, never its key, or null. Needs assistant:configure.
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
      #   client.assistant.text_provider(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::TextProviderSetting]
      def text_provider(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/text-provider",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::TextProviderSetting.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sets the text provider the workspace brings, Anthropic's Messages API or an endpoint that speaks the OpenAI chat
      # completions API, whose suggestions then spend none of the workspace's daily assistant requests. The workspace's
      # drafts, and the subjects of the posts it asks the assistant to write, then go to `baseUrl` with `apiKey`, under
      # that provider's terms. Peal keeps the key encrypted for this workspace and this address, never shows it again,
      # and never sends it to another address: `apiKey` may be left out to keep the stored one only while `baseUrl`
      # stays exactly the same (to change the model alone). The address must be public HTTPS; it is checked now, and
      # before every call. The provider is not called: test it with `POST .../text-provider/test`. Needs
      # assistant:configure, which no OAuth client holds but Peal's command line.
      #
      # @param request_options [Hash]
      # @param params [Peal::Assistant::Types::TextProviderChange]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.assistant.set_text_provider(
      #     workspace_id: "workspaceId",
      #     base_url: "baseUrl",
      #     kind: "anthropic",
      #     model: "model"
      #   )
      #
      # @return [Peal::Types::TextProvider]
      def set_text_provider(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Assistant::Types::TextProviderChange.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PUT",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/text-provider",
          body: body,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::TextProvider.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Removes the workspace's text provider and its key: the server's language model writes again, if it has one,
      # within the workspace's daily requests. Needs assistant:configure.
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
      #   client.assistant.remove_text_provider(workspace_id: "workspaceId")
      #
      # @return [untyped]
      def remove_text_provider(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/text-provider",
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

      # Sends the workspace's text provider one short request, a rewrite of a fixed sentence, as a member's request
      # would go, and answers 204 once the provider gave a suggestion the assistant can use. Otherwise the answer says
      # why, as a suggestion's would: TextProviderRefused (its settings, a redirect, its address or its key) or
      # AssistantFailed (unreachable, timed out, declined, or an answer the assistant cannot use: often a model without
      # structured output). It counts as one of the day's requests to that provider, and nothing of Peal's. Needs
      # assistant:configure.
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
      #   client.assistant.test_text_provider(workspace_id: "workspaceId")
      #
      # @return [untyped]
      def test_text_provider(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/assistant/text-provider/test",
          request_options: request_options,
          max_retries: 0
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
    end
  end
end
