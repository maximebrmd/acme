# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PinterestBoard < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :privacy, -> { String }, optional: false, nullable: true
    end
  end
end
