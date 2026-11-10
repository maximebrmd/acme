# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ImportColumn
      extend Peal::Internal::Types::Enum

      TEXT = "text"
      CHANNELS = "channels"
      MEDIA = "media"
      AT = "at"
      TIME_ZONE = "time_zone"
      ALLOW_DUPLICATE = "allow_duplicate"
      IDEMPOTENCY_KEY = "idempotency_key"
    end
  end
end
