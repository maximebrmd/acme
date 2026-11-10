# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FieldDefault < Internal::Types::Model
      extend Peal::Internal::Types::Union

      member -> { Internal::Types::Boolean }

      member -> { Float }

      member -> { String }
    end
  end
end
