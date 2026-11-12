# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BadRequestErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::InvalidDateRangeEncoded }, key: "INVALID_DATE_RANGE"

      member -> { Peal::Types::EffectHttpApiErrorBadRequestEncoded }, key: "BAD_REQUEST"
    end
  end
end
