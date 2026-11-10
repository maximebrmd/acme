# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PlatformRateLimitedEncodedTag
      extend Peal::Internal::Types::Enum

      PLATFORM_RATE_LIMITED = "PlatformRateLimited"
    end
  end
end
