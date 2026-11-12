# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CreatedFeed < Internal::Types::Model
      field :feed, -> { Peal::Types::Feed }, optional: false, nullable: false

      field :seen, -> { Integer }, optional: false, nullable: false
    end
  end
end
