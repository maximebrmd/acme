# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnprocessableEntityErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ConnectFailedEncoded }, key: "CONNECT_FAILED"

      member -> { Peal::Types::ReturnURLNotAllowedEncoded }, key: "RETURN_URL_NOT_ALLOWED"
    end
  end
end
