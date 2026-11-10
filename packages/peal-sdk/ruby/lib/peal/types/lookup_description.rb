# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LookupDescription < Internal::Types::Model
      field :fills, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :input, -> { Internal::Types::Array[Peal::Types::FieldDescription] }, optional: false, nullable: false

      field :name, -> { Peal::Types::LookupName }, optional: false, nullable: false

      field :paged, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false
    end
  end
end
