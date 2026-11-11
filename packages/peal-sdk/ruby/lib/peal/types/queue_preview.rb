# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class QueuePreview < Internal::Types::Model
      field :next_free, -> { String }, optional: false, nullable: true, api_name: "nextFree"

      field :no_room, -> { Peal::Types::QueueNoRoom }, optional: false, nullable: true, api_name: "noRoom"

      field :slots, -> { Internal::Types::Array[Peal::Types::PreviewSlot] }, optional: false, nullable: false
    end
  end
end
