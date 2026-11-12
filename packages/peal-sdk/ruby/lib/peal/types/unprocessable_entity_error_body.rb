# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnprocessableEntityErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::RecyclingEndsTooSoonEncoded }, key: "RECYCLING_ENDS_TOO_SOON"

      member -> { Peal::Types::RecyclingVariantsInvalidEncoded }, key: "RECYCLING_VARIANTS_INVALID"
    end
  end
end
