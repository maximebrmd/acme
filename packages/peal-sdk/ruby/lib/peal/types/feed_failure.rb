# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FeedFailure
      extend Peal::Internal::Types::Enum

      TIMEOUT = "timeout"
      RATE_LIMITED = "rateLimited"
      SERVER_ERROR = "serverError"
      NOT_FOUND = "notFound"
      GONE = "gone"
      NOT_A_FEED = "notAFeed"
      TOO_LARGE = "tooLarge"
      REFUSED = "refused"
      UNREACHABLE = "unreachable"
    end
  end
end
