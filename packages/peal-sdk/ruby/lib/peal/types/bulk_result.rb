# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BulkResult < Internal::Types::Model
      field :created, -> { Integer }, optional: false, nullable: false

      field :items, -> { Internal::Types::Array[Peal::Types::BulkPostResult] }, optional: false, nullable: false

      field :refused, -> { Integer }, optional: false, nullable: false
    end
  end
end
