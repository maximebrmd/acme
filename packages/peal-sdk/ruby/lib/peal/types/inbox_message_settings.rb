# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxMessageSettings < Internal::Types::Model
      field :applications, -> { Internal::Types::Array[Peal::Types::InboxMessageApplication] }, optional: false, nullable: false

      field :channels, -> { Internal::Types::Array[Peal::Types::InboxMessageChannel] }, optional: false, nullable: false
    end
  end
end
