# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlatformRateLimitedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::PlatformRateLimitedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :retry_after_seconds, -> { Integer }, optional: false, nullable: true, api_name: "retryAfterSeconds"
    end
  end
end
