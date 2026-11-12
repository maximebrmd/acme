# frozen_string_literal: true

module Peal
  module Credential
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Answers who the credential this request sends is and what it may do, whatever its kind: a person's session or an
      # OAuth client's token (`user`, with the staff member acting as the person, if any, and for an OAuth token the
      # client's scopes and its `binding`: no workspace, the workspace it is bound to with its permissions there, or one
      # the person has left), a workspace's API key (`apiKey`: its name, its start, its workspace, its permissions and
      # when it expires) or a partner key (`partnerKey`: its partner, its scopes and the permissions it holds in each
      # workspace the partner owns). Never the key or the token itself. A revoked or expired key answers 401, a
      # suspended account 403, as on every endpoint; a workspace that requires two-step verification does not refuse
      # this answer, which reads none of its data. It counts toward the rate limit as any request does.
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
      #   client.credential.get
      #
      # @return [Peal::Types::Credential]
      def get(request_options: {}, **_params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/credential",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Credential.load(response.body))
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
