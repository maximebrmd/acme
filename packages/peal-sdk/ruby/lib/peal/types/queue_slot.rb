# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class QueueSlot < Internal::Types::Model
      field :day, -> { Peal::Types::Weekday }, optional: false, nullable: false

      field :time, -> { String }, optional: false, nullable: false
    end
  end
end
