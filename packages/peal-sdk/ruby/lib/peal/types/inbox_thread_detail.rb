# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxThreadDetail < Internal::Types::Model
      field :abilities, -> { Peal::Types::InboxAbilities }, optional: false, nullable: false

      field :comments, -> { Internal::Types::Array[Peal::Types::InboxComment] }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: true

      field :replies, -> { Internal::Types::Array[Peal::Types::InboxReply] }, optional: false, nullable: false

      field :thread, -> { Peal::Types::InboxThread }, optional: false, nullable: false
    end
  end
end
