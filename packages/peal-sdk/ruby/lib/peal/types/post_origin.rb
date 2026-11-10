# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostOrigin < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: true

      field :name, -> { String }, optional: false, nullable: true

      field :via, -> { Peal::Types::PostOriginVia }, optional: false, nullable: false
    end
  end
end
