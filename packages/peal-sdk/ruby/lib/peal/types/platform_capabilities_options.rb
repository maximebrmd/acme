# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlatformCapabilitiesOptions < Internal::Types::Model
      field :constraints, -> { Internal::Types::Array[Peal::Types::OptionConstraint] }, optional: false, nullable: false

      field :fields, -> { Internal::Types::Array[Peal::Types::FieldDescription] }, optional: false, nullable: false
    end
  end
end
