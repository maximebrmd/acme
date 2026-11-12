# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedAddressRefusedEncodedReason
      extend Peal::Internal::Types::Enum

      CREDENTIALS = "credentials"
      MALFORMED = "malformed"
      NOT_HTTPS = "notHttps"
      NOT_PUBLIC = "notPublic"
    end
  end
end
