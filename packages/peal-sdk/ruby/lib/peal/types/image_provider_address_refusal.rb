# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ImageProviderAddressRefusal
      extend Peal::Internal::Types::Enum

      MALFORMED = "malformed"
      NOT_HTTPS = "notHttps"
      CREDENTIALS = "credentials"
      QUERY_OR_FRAGMENT = "queryOrFragment"
      TOO_LONG = "tooLong"
      NOT_PUBLIC = "notPublic"
      UNKNOWN_HOST = "unknownHost"
    end
  end
end
