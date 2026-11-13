# frozen_string_literal: true

module Peal
  module Media
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's media, newest first, 30 a page unless `limit` (at most 100) says otherwise. Every filter
      # given must hold: `kind` (`image`, `video` or `document`), and `q`, text the file's name or its description
      # holds, whatever its case (a file added before Peal kept names is found by its description only). Pass the page's
      # `nextCursor` as `cursor`, with the same filters, for the next one. Needs media:read.
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
      # @option params [Peal::Types::MediaKind, nil] :kind
      # @option params [String, nil] :limit
      # @option params [String, nil] :q
      #
      # @example
      #   client.media.list(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::MediaPage]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["kind"] = params[:kind] if params.key?(:kind)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["q"] = params[:q] if params.key?(:q)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/media",
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
          (response.body.to_s.empty? ? nil : Peal::Types::MediaPage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT
      # per part for a larger video. Send the file with them, then complete the upload. Give `fileName`, what the file
      # is called on the device, so members find it in the library by its name. The requests only take the declared size
      # and content type. On a server that bills, the declared size must fit the plan's media storage with what the
      # workspace stores (PlanLimitReached `mediaStorage`). Needs media:upload.
      #
      # @param request_options [Hash]
      # @param params [Peal::Media::Types::NewUpload]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.media.create(
      #     workspace_id: "workspaceId",
      #     byte_size: 1000000,
      #     content_type: "contentType"
      #   )
      #
      # @return [Peal::Types::PreparedUpload]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Media::Types::NewUpload.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/media",
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
          (response.body.to_s.empty? ? nil : Peal::Types::PreparedUpload.load(response.body))
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

      # Fetches a file from a public address, stores it as media of the workspace and probes it, as completing an upload
      # does: the answer is the media, ready, or uploaded with why it could not be probed. The media is named after the
      # last segment of the address's path, once redirects are followed, never its query. The server fetches it itself,
      # from HTTPS URLs on the default port whose host resolves to public addresses only, without credentials or
      # cookies, following at most three redirects, each checked the same way (MediaSourceNotPublic otherwise). The
      # file's type is read from its first bytes, not from what the host says: JPEG, PNG, GIF and WebP images up to 16
      # MiB, MP4 and QuickTime videos up to 1 GiB (UnsupportedMediaType, MediaTooLarge). It must arrive within 90
      # seconds (MediaSourceUnreachable `tooSlow`): upload larger or slower files instead. On a server that bills, it
      # must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). A workspace
      # imports two files at once, and the server eight (429 MediaImportBusy: ask again in a moment). Needs
      # media:upload.
      #
      # @param request_options [Hash]
      # @param params [Peal::Media::Types::MediaImport]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.media.import_from_url(
      #     workspace_id: "workspaceId",
      #     url: "url"
      #   )
      #
      # @return [Peal::Types::Media]
      def import_from_url(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Media::Types::MediaImport.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/media/import",
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

      # Shows one of the workspace's media. Needs media:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :media_id
      #
      # @example
      #   client.media.get(
      #     workspace_id: "workspaceId",
      #     media_id: "mediaId"
      #   )
      #
      # @return [Peal::Types::Media]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/media/#{URI.encode_uri_component(params[:media_id].to_s)}",
          request_options: request_options
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
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it.
      # Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to
      # draft first. Needs media:delete.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :media_id
      #
      # @example
      #   client.media.delete(
      #     workspace_id: "workspaceId",
      #     media_id: "mediaId"
      #   )
      #
      # @return [untyped]
      def delete(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/media/#{URI.encode_uri_component(params[:media_id].to_s)}",
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

      # Sets the media's description, which platforms show to people who cannot see it. It can be written while the file
      # uploads. Needs media:upload.
      #
      # @param request_options [Hash]
      # @param params [Peal::Media::Types::MediaDescription]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :media_id
      #
      # @example
      #   client.media.describe(
      #     workspace_id: "workspaceId",
      #     media_id: "mediaId",
      #     alt_text: nil
      #   )
      #
      # @return [Peal::Types::Media]
      def describe(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Media::Types::MediaDescription.new(params).to_h
        non_body_param_names = %w[workspaceId mediaId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/media/#{URI.encode_uri_component(params[:media_id].to_s)}",
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
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Checks that the file reached the store with the declared size and type, joining its parts first, then probes it:
      # the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an
      # uploaded file again. On a server that bills, the room an upload was given is held while its URLs work: completed
      # later, it needs room in the plan's media storage again, and without it the file is deleted (PlanLimitReached
      # `mediaStorage`). Needs media:upload.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :media_id
      #
      # @example
      #   client.media.complete(
      #     workspace_id: "workspaceId",
      #     media_id: "mediaId"
      #   )
      #
      # @return [Peal::Types::Media]
      def complete(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/media/#{URI.encode_uri_component(params[:media_id].to_s)}/complete",
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

      # Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing,
      # which keep it from being deleted. Needs media:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :media_id
      #
      # @example
      #   client.media.usage(
      #     workspace_id: "workspaceId",
      #     media_id: "mediaId"
      #   )
      #
      # @return [Peal::Types::MediaUsage]
      def usage(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/media/#{URI.encode_uri_component(params[:media_id].to_s)}/usage",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::MediaUsage.load(response.body))
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
