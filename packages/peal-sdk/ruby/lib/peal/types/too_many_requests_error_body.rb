# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyRequestsErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::FeedReadsLimitedEncoded }, key: "FEED_READS_LIMITED"

      member -> { Peal::Types::TooManyRequestsEncoded }, key: "TOO_MANY_REQUESTS"
    end
  end
end
