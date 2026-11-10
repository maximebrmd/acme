# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class APIChangelogEntry < Internal::Types::Model
      field :additions, -> { Integer }, optional: false, nullable: false

      field :breaking, -> { Internal::Types::Array[Peal::Types::BreakingChange] }, optional: false, nullable: false

      field :date, -> { String }, optional: false, nullable: false

      field :deprecations, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :operations, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :title, -> { String }, optional: false, nullable: false
    end
  end
end
