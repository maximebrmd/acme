# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TargetParts < Internal::Types::Model
      field :count, -> { Integer }, optional: false, nullable: false

      field :live, -> { Internal::Types::Array[Peal::Types::LivePart] }, optional: false, nullable: false
    end
  end
end
