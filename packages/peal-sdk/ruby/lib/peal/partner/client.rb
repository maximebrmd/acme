# frozen_string_literal: true

module Peal
  module Partner
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # The partner account the key belongs to, with what it holds: the workspaces it owns and the channels connected
      # across them and its home workspace, now and at the end of each of the last 35 days (UTC). Takes a partner key
      # (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
      #
      # @param request_options [Hash]
      # @param _params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      #
      # @example
      #   client.partner.account
      #
      # @return [Peal::Types::PartnerOverview]
      def account(request_options: {}, **_params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/partner",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::PartnerOverview.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Lists the workspaces the partner owns, newest first, each with the number of channels connected in it, 50 a page
      # unless `limit` (at most 100) says otherwise. `externalId` finds the one workspace with that external id,
      # exactly; `name` those whose name holds the text, whatever its case. `total` counts what the filters find; pass
      # the page's `next` as `before` for the next page, as it is: it is a position in the list, which stays good when
      # workspaces before it are offboarded, and anything else is refused (400). Needs the scope workspaces:read. Takes
      # a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :before
      # @option params [String, nil] :external_id
      # @option params [String, nil] :limit
      # @option params [String, nil] :name
      #
      # @example
      #   client.partner.list_workspaces
      #
      # @return [Peal::Types::CustomerWorkspacePage]
      def list_workspaces(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["before"] = params[:before] if params.key?(:before)
        query_params["externalId"] = params[:external_id] if params.key?(:external_id)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["name"] = params[:name] if params.key?(:name)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/partner/workspaces",
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
          (response.body.to_s.empty? ? nil : Peal::Types::CustomerWorkspacePage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Creates a workspace for one of the partner's customers: it has no members, shares the plan of the partner's home
      # workspace, and the partner's keys act in it. `externalId`, the partner's own id for its customer, is unique
      # among the partner's workspaces: a second workspace with it answers 409 `ExternalIdTaken` with the id of the one
      # that has it, so a creation sent twice never makes two. Send an `Idempotency-Key` header (any text of your
      # choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the
      # same key with the same body answers the workspace the first request made, as it now stands, and makes no other;
      # the same key with another body is refused (`IdempotencyKeyReused`), and answers `WorkspaceNotFound` once that
      # workspace was deleted. Keys are kept per partner, as digests. Needs the scope workspaces:write. Takes a partner
      # key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
      #
      # @param request_options [Hash]
      # @param params [Peal::Partner::Types::NewCustomerWorkspace]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String, nil] :idempotency_key
      #
      # @example
      #   client.partner.create_workspace(name: "name")
      #
      # @return [Peal::Types::CustomerWorkspace]
      def create_workspace(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Partner::Types::NewCustomerWorkspace.new(params).to_h
        non_body_param_names = %w[idempotency-key]
        body = request_data.except(*non_body_param_names)

        headers = {}
        headers["idempotency-key"] = params[:idempotency_key] if params[:idempotency_key]

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/partner/workspaces",
          headers: headers,
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
          (response.body.to_s.empty? ? nil : Peal::Types::CustomerWorkspace.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # One workspace the partner owns, with the number of channels connected in it. A workspace of anyone else answers
      # 404, as one that does not exist. Needs the scope workspaces:read. Takes a partner key (`Authorization: Bearer
      # peal_partner_…`): any other credential answers 403.
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
      #   client.partner.get_workspace(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::CustomerWorkspace]
      def get_workspace(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/partner/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::CustomerWorkspace.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Offboards a customer: deletes the workspace and everything in it, for good, as deleting a workspace does for its
      # owner: its channels and their tokens (revoked at the platforms that take it, when no other workspace connects
      # the same account), its posts, scheduled ones included, which then go out nowhere, its media and their files, its
      # analytics, its webhook endpoints and their logs, its connect links. It cannot be undone. Answers 409 while a
      # post of the workspace is being published (`WorkspaceBusy`): send it again a moment later. The deletion is
      # recorded by id in the object store before it is done, so that a restored backup deletes the workspace again;
      # when the store cannot be reached, nothing is deleted (503 `MediaStoreUnavailable`). Only a workspace the partner
      # owns: any other answers 404. Needs the scope workspaces:delete. Takes a partner key (`Authorization: Bearer
      # peal_partner_…`): any other credential answers 403.
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
      #   client.partner.delete_workspace(workspace_id: "workspaceId")
      #
      # @return [untyped]
      def delete_workspace(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/partner/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}",
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
          401 => Peal::Types::UnauthenticatedEncoded,
          500 => Peal::Types::DeletionIncompleteEncoded
        }
        error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
        raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
      end

      # Changes a workspace's name or external id: what is left out stays as it is, and a null `externalId` removes it.
      # An external id another of the partner's workspaces has answers 409 `ExternalIdTaken`. Needs the scope
      # workspaces:write. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers
      # 403.
      #
      # @param request_options [Hash]
      # @param params [Peal::Partner::Types::CustomerWorkspaceChange]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.partner.update_workspace(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::CustomerWorkspace]
      def update_workspace(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Partner::Types::CustomerWorkspaceChange.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/partner/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}",
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
          (response.body.to_s.empty? ? nil : Peal::Types::CustomerWorkspace.load(response.body))
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
