# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostTiming < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::PostTimingNow }, key: "NOW"

      member -> { Peal::Types::PostTimingAt }, key: "AT"
    end
  end
end
