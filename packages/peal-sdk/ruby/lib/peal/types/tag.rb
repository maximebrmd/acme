# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Tag < Internal::Types::Model
      field :colour, -> { Peal::Types::TagColour }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false
    end
  end
end
