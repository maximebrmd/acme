# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module MediaSourceFailure
      extend Peal::Internal::Types::Enum

      UNKNOWN_HOST = "unknownHost"
      NO_ANSWER = "noAnswer"
      BAD_STATUS = "badStatus"
      TOO_MANY_REDIRECTS = "tooManyRedirects"
      TOO_SLOW = "tooSlow"
    end
  end
end
