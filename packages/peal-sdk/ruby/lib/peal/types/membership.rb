# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Membership < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :permissions, -> { Internal::Types::Array[Peal::Types::Permission] }, optional: false, nullable: false

      field :role, -> { String }, optional: false, nullable: false

      field :slug, -> { String }, optional: false, nullable: false
    end
  end
end
