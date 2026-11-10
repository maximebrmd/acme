# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TooManyRequestsEncodedTag
      extend Peal::Internal::Types::Enum

      TOO_MANY_REQUESTS = "TooManyRequests"
    end
  end
end
