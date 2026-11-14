# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxConversationDetail < Internal::Types::Model
      field :abilities, -> { Peal::Types::InboxMessageAbilities }, optional: false, nullable: false

      field :conversation, -> { Peal::Types::InboxConversation }, optional: false, nullable: false

      field :messages, -> { Internal::Types::Array[Peal::Types::InboxDirectMessage] }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: true

      field :sent, -> { Internal::Types::Array[Peal::Types::InboxOutgoingMessage] }, optional: false, nullable: false

      field :window, -> { Peal::Types::InboxReplyWindow }, optional: false, nullable: false
    end
  end
end
