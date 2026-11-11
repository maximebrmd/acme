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

      field :two_step_required, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "twoStepRequired"
    end
  end
end
