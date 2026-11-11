# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LivePostChanges < Internal::Types::Model
      field :items, -> { Internal::Types::Array[Peal::Types::LivePostChange] }, optional: false, nullable: false
    end
  end
end
