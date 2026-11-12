# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RecyclingVariant < Internal::Types::Model
      field :overrides, -> { Internal::Types::Array[Peal::Types::TextOverride] }, optional: true, nullable: false

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
