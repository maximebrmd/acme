# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BulkPostResultCreated < Internal::Types::Model
      field :index, -> { Integer }, optional: false, nullable: false

      field :post, -> { Peal::Types::Post }, optional: false, nullable: false

      field :replayed, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
