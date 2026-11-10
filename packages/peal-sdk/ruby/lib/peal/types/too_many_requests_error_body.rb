# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyRequestsErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::TooManyConnectLinksEncoded }, key: "TOO_MANY_CONNECT_LINKS"

      member -> { Peal::Types::TooManyRequestsEncoded }, key: "TOO_MANY_REQUESTS"
    end
  end
end
